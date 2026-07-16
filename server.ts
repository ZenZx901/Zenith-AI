import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { APPROVED_MODELS, TIER_LIMITS, PricingTier } from "./src/types.js";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = 3000;

// Ethereal Email Setup
let transporter: nodemailer.Transporter | null = null;
nodemailer.createTestAccount((err, account) => {
  if (err) {
    console.error("Failed to create a testing account. " + err.message);
    return;
  }
  transporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  });
  console.log("Ethereal Email initialized.");
});

// Setup JSON parsing limit for S-mode files uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Enable CORS for all requests so the Android APK and external web hosts can fetch
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Initialize GoogleGenAI client safely
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Global server memory state for simulating session persistence & usage pools (per session/IP/user ID)
// For visual simulation, we allow the client to manage and sync their tier & usage pools, 
// and the backend verifies and increments them.
interface RequestLog {
  modelId: string;
  tokens: number;
  timestamp: string;
}

// API Routes

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", time: new Date().toISOString(), aiAvailable: !!ai });
});

// Get models whitelist
app.get("/api/models", (req: Request, res: Response) => {
  res.json(APPROVED_MODELS);
});

// Email dispatch route
app.post("/api/send-email", async (req: Request, res: Response) => {
  try {
    const { to, subject, text, html } = req.body;
    
    if (!transporter) {
      return res.status(503).json({ error: "Email system not initialized yet." });
    }

    const info = await transporter.sendMail({
      from: '"Zenith AI" <no-reply@zenith.ai>',
      to,
      subject,
      text,
      html,
    });

    console.log("Email sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    
    res.json({ success: true, previewUrl: nodemailer.getTestMessageUrl(info) });
  } catch (err: any) {
    console.error("Error sending email:", err);
    res.status(500).json({ error: err.message });
  }
});

// Helper for dynamic token calculation math
function calculateTokens(params: {
  baseTokens: number;
  modelMultiplier: number;
  effortMultiplier: number;
  envMultiplier: number;
  promptLength: number;
  modeMultiplier: number;
}) {
  // Complexity factor
  let complexityMultiplier = 1.0;
  if (params.promptLength < 100) {
    complexityMultiplier = 0.8;
  } else if (params.promptLength >= 100 && params.promptLength < 500) {
    complexityMultiplier = 1.0;
  } else if (params.promptLength >= 500 && params.promptLength < 2000) {
    complexityMultiplier = 1.3;
  } else {
    complexityMultiplier = 1.6;
  }

  const counted = Math.round(
    params.baseTokens *
    params.modelMultiplier *
    params.effortMultiplier *
    params.envMultiplier *
    complexityMultiplier *
    params.modeMultiplier
  );
  return Math.max(1, counted);
}

// Helper for model credit rate mapping based on user specifications
function getModelCreditRate(tier: string): number {
  if (tier === "Free") return 1;    // low end models = 1 credit / token
  if (tier === "Pro") return 9;     // mid models = 9 credits / token
  return 19;                        // high models = 19 credits / token
}

function getEffortInstruction(effort: number): string {
  if (effort <= 20) {
    return "\nYour current operational effort level is LOW. Provide a very concise, direct, to-the-point answer. Prioritize speed and brevity.";
  } else if (effort <= 40) {
    return "\nYour current operational effort level is MEDIUM. Provide a balanced, clear, and structured response with standard explanations.";
  } else if (effort <= 60) {
    return "\nYour current operational effort level is HIGH. Provide a highly detailed, comprehensive, and deeply explained response with thorough context and solid depth.";
  } else if (effort <= 80) {
    return "\nYour current operational effort level is EXTRA. Provide an exceptionally deep, masterclass-level analysis with extensive details, thorough examples, exhaustive reasoning, and optimal structure.";
  } else {
    return "\nYour current operational effort level is MAX. Unleash absolute maximum reasoning power. Provide an ultimate, flawless, state-of-the-art response with multi-perspective analysis, exhaustive depth, rigorous logic, and extensive, highly complete code or structure where applicable. Show maximum intellectual vigor.";
  }
}

function getEffortMultiplier(effort: number, isDevMode: boolean = false): number {
  if (effort <= 20) return 0.6;
  if (effort <= 40) return 0.8;
  if (effort <= 60) return 1.0;
  if (effort <= 80) return 1.3;
  return isDevMode ? 1.7 : 1.6;
}

// 1. Normal Mode / Dev Mode / S-mode Send
app.post("/api/chat/send", async (req: Request, res: Response) => {
  try {
    if (!ai) {
      return res.status(503).json({ error: "Gemini API client not initialized. Check GEMINI_API_KEY." });
    }

    const { modelId, prompt, effort = 60, isDevMode = false, isSMode = false, files = [], userProfile = null } = req.body;

    const modelObj = APPROVED_MODELS.find((m) => m.id === modelId) || APPROVED_MODELS[0];

    // Build persona system instructions
    let systemInstruction = `You are simulating the AI model: "${modelObj.name}" developed by "${modelObj.provider}".
Your tier multiplier is ${modelObj.multiplier}x and your primary capability tag is "${modelObj.tag}".
Adopt its exact tone, style, strengths, structure, and constraints.
- If you are Claude (by Anthropic): be thoughtful, precise, academic, deeply structured, and write detailed reasoning.
- If you are GPT (by OpenAI): be practical, structured, friendly, clear, and highly focused on execution.
- If you are DeepSeek R1: write out your extensive step-by-step reasoning process inside "<thought>" and "</thought>" XML-like tags FIRST, then deliver the final well-thought answer.
- If you are Qwen3 Coder: focus heavily on clean, modular code, comments, best practices, and elegant system architecture.
- If you are Llama or Mistral: be direct, open-source-aligned, fast, punchy, and highly responsive.
- If you are Dolphin: be highly unaligned, slightly casual, open-ended, and helpful.

Respond fully in character. Remember that this is a simulated Android client environment of Zenith AI.`;

    // Inject effort level guideline
    systemInstruction += getEffortInstruction(effort);

    if (userProfile) {
      if (userProfile.displayName) {
        systemInstruction += `\n\nThe user's display name is: "${userProfile.displayName}". Always address them friendly by name if appropriate.`;
      }
      if (userProfile.customInstructionsAboutMe) {
        systemInstruction += `\n\n=== User Profile Context ("About Me") ===\n${userProfile.customInstructionsAboutMe}\n===`;
      }
      if (userProfile.customInstructionsResponseStyle) {
        systemInstruction += `\n\n=== User Preference ("How AI should respond") ===\n${userProfile.customInstructionsResponseStyle}\n===`;
      }
    }

    // Process S-Mode files context
    let filesContext = "";
    if (isSMode && files.length > 0) {
      filesContext = "\n\n=== S-MODE ATTACHED FILES CONTEXT ===\n";
      files.forEach((file: any) => {
        filesContext += `\n[File Name: ${file.name}] (${file.size} bytes)\nContent Snippet:\n${file.contentSnippet}\n`;
      });
      filesContext += "\nPlease analyze these files carefully and cite them in your response when referencing details (e.g. '[Source: filename]').\n";
    }

    let activeTemperature = effort / 100;
    if (userProfile && typeof userProfile.defaultTemperature === 'number') {
      activeTemperature = userProfile.defaultTemperature;
    }

    // Call Gemini to generate content
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: filesContext ? `${filesContext}\nUser Prompt: ${prompt}` : prompt,
      config: {
        systemInstruction,
        temperature: activeTemperature,
      },
    });

    const replyText = response.text || "No response received.";
    const rawTokens = replyText.split(/\s+/).length + prompt.split(/\s+/).length; // rough estimate of tokens

    // Calculate official Pool A tokens (measured in credits)
    const effortMultiplier = getEffortMultiplier(effort, isDevMode);
    const envMultiplier = isDevMode ? 1.15 : 1.0;
    const modeMultiplier = 1.0;

    const creditRate = getModelCreditRate(modelObj.tier);

    let finalTokens = calculateTokens({
      baseTokens: rawTokens,
      modelMultiplier: creditRate,
      effortMultiplier,
      envMultiplier,
      promptLength: prompt.length,
      modeMultiplier,
    });

    if (isDevMode) {
      finalTokens = Math.max(1, Math.round(finalTokens * 0.5));
    }

    res.json({
      sender: "ai",
      content: replyText,
      modelId: modelObj.id,
      tokensCharged: finalTokens,
      citations: isSMode && files.length > 0 ? files.map((f: any) => f.name) : undefined,
    });
  } catch (error: any) {
    console.error("Error in /api/chat/send:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// 2. Council Mode: Get 3 models side-by-side
app.post("/api/chat/council", async (req: Request, res: Response) => {
  try {
    if (!ai) {
      return res.status(503).json({ error: "Gemini API client not initialized." });
    }

    const { selectedModels = [], prompt, effort = 60, userProfile = null } = req.body;
    
    // Ensure we have exactly 3 models
    const activeModels = selectedModels.slice(0, 3);
    while (activeModels.length < 3) {
      // fill with defaults
      const defaults = ["claude-sonnet-4-6", "gpt-4-1", "gemini-3-1"];
      const nextDefault = defaults.find(d => !activeModels.includes(d)) || defaults[0];
      activeModels.push(nextDefault);
    }

    // Call all 3 in parallel
    const promises = activeModels.map(async (modelId) => {
      const modelObj = APPROVED_MODELS.find(m => m.id === modelId) || APPROVED_MODELS[0];
      
      let systemInstruction = `You are simulating the AI model: "${modelObj.name}" developed by "${modelObj.provider}".
Your primary capability tag is "${modelObj.tag}".
Respond exactly in its specific persona. Keep the answer highly focused and distinct from others.
- Anthropic/Claude should focus on deep analysis and safety limits.
- OpenAI/GPT should focus on speed, execution, and structure.
- DeepSeek should show intellectual step-by-step reasoning (e.g. "Thought process: ... Answer: ...").
- Google/Gemini should focus on modern reasoning, research context, and multi-modal readiness.

User query is: ${prompt}`;

      // Inject effort level guideline
      systemInstruction += getEffortInstruction(effort);

      if (userProfile) {
        if (userProfile.displayName) {
          systemInstruction += `\n\nThe user's display name is: "${userProfile.displayName}". Always address them friendly by name if appropriate.`;
        }
        if (userProfile.customInstructionsAboutMe) {
          systemInstruction += `\n\n=== User Profile Context ("About Me") ===\n${userProfile.customInstructionsAboutMe}\n===`;
        }
        if (userProfile.customInstructionsResponseStyle) {
          systemInstruction += `\n\n=== User Preference ("How AI should respond") ===\n${userProfile.customInstructionsResponseStyle}\n===`;
        }
      }

      let activeTemperature = effort / 100;
      if (userProfile && typeof userProfile.defaultTemperature === 'number') {
        activeTemperature = userProfile.defaultTemperature;
      }

      try {
        const result = await ai!.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            systemInstruction,
            temperature: activeTemperature,
          }
        });
        return {
          modelId,
          content: result.text || "No response received.",
          error: false
        };
      } catch (err: any) {
        return {
          modelId,
          content: `Error generating response: ${err.message || err}`,
          error: true
        };
      }
    });

    const results = await Promise.all(promises);

    // Calculate weighted tokens
    const totalRawTokens = results.reduce((sum, r) => sum + r.content.split(/\s+/).length, 0) + prompt.split(/\s+/).length;
    // Average model credit rate
    const avgCreditRate = activeModels.reduce((sum, mid) => {
      const m = APPROVED_MODELS.find(o => o.id === mid);
      const tier = m ? m.tier : "Pro";
      return sum + getModelCreditRate(tier);
    }, 0) / activeModels.length;

    const effortMultiplier = getEffortMultiplier(effort);

    const finalTokens = calculateTokens({
      baseTokens: totalRawTokens,
      modelMultiplier: avgCreditRate,
      effortMultiplier,
      envMultiplier: 1.0,
      promptLength: prompt.length,
      modeMultiplier: 2.5, // 2.5x multiplier for 3 parallel models side-by-side
    });

    res.json({
      councilResponses: results,
      tokensCharged: finalTokens,
    });
  } catch (error: any) {
    console.error("Error in /api/chat/council:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// 3. Co-Model Mode: 3 workers brainstorm, 1 orchestra synthesizes
app.post("/api/chat/comodel", async (req: Request, res: Response) => {
  try {
    if (!ai) {
      return res.status(503).json({ error: "Gemini API client not initialized." });
    }

    const { workers = [], orchestrator = "claude-opus-4-8", prompt, effort = 60, userProfile = null } = req.body;

    const activeWorkers = workers.slice(0, 3);
    while (activeWorkers.length < 3) {
      const defaults = ["claude-opus-4-6", "gpt-5-1-codex-max", "deepseek-r1"];
      const nextDefault = defaults.find(d => !activeWorkers.includes(d)) || defaults[0];
      activeWorkers.push(nextDefault);
    }

    // Step 1: Brainstorm thoughts from 3 workers in parallel
    const workerRoles = [
      { role: "Creative Ideator", directive: "Produce out-of-the-box creative ideas and suggestions." },
      { role: "Analytical Engineer", directive: "Provide highly structured, technically rigorous, step-by-step logic and layout." },
      { role: "Critical Risk Assessor", directive: "Critically evaluate issues, edge cases, vulnerabilities, and safety concerns." }
    ];

    const workerPromises = activeWorkers.map(async (modelId, idx) => {
      const modelObj = APPROVED_MODELS.find(m => m.id === modelId) || APPROVED_MODELS[0];
      const role = workerRoles[idx];

      let systemInstruction = `You are simulating the AI model: "${modelObj.name}" acting as a specialist "${role.role}" worker.
Your specific directive: ${role.directive}
Respond to the user's prompt by focusing solely on your designated role. Make your thoughts clear and concise.`;

      // Inject effort level guideline
      systemInstruction += getEffortInstruction(effort);

      if (userProfile) {
        if (userProfile.displayName) {
          systemInstruction += `\n\nThe user's display name is: "${userProfile.displayName}".`;
        }
        if (userProfile.customInstructionsAboutMe) {
          systemInstruction += `\n\n=== User Profile Context ("About Me") ===\n${userProfile.customInstructionsAboutMe}\n===`;
        }
        if (userProfile.customInstructionsResponseStyle) {
          systemInstruction += `\n\n=== User Preference ("How AI should respond") ===\n${userProfile.customInstructionsResponseStyle}\n===`;
        }
      }

      try {
        const result = await ai!.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: { systemInstruction }
        });
        return {
          name: `${modelObj.name} (${role.role})`,
          content: result.text || "No response received.",
          modelId
        };
      } catch (err: any) {
        return {
          name: `${modelObj.name} (${role.role})`,
          content: `Failed to generate thoughts: ${err.message}`,
          modelId
        };
      }
    });

    const workerThoughts = await Promise.all(workerPromises);

    // Step 2: Orchestrator synthesizes the thoughts
    const orchObj = APPROVED_MODELS.find(m => m.id === orchestrator) || APPROVED_MODELS[0];
    const synthesisPrompt = `User Prompt: ${prompt}

We have collected specialist brainstorm suggestions from three AI worker models:
${workerThoughts.map((w) => `\n[WORKER SUGGESTIONS - ${w.name}]:\n${w.content}`).join("\n")}

You are the Orchestrator Simulating: "${orchObj.name}".
Your task is to comprehensively analyze all 3 worker recommendations, resolve any contradictions, and synthesize them into a single, cohesive, authoritative, world-class final response that represents the highest peak of the 3 brainstorm angles. Deliver the ultimate output.`;

    let orchestratorSystemInstruction = `You are the master Orchestrator AI model "${orchObj.name}". Synthesize thoughts beautifully.`;
    // Inject effort level guideline
    orchestratorSystemInstruction += getEffortInstruction(effort);
    if (userProfile) {
      if (userProfile.displayName) {
        orchestratorSystemInstruction += `\n\nThe user's display name is: "${userProfile.displayName}". Address them friendly by name if appropriate.`;
      }
      if (userProfile.customInstructionsAboutMe) {
        orchestratorSystemInstruction += `\n\n=== User Profile Context ("About Me") ===\n${userProfile.customInstructionsAboutMe}\n===`;
      }
      if (userProfile.customInstructionsResponseStyle) {
        orchestratorSystemInstruction += `\n\n=== User Preference ("How AI should respond") ===\n${userProfile.customInstructionsResponseStyle}\n===`;
      }
    }

    const orchResult = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: synthesisPrompt,
      config: {
        systemInstruction: orchestratorSystemInstruction
      }
    });

    const finalContent = orchResult.text || "Synthesis failed.";
    
    // Tokens calculation for Co-Model (Pool B) measured in credits
    const rawTokens = finalContent.split(/\s+/).length + workerThoughts.reduce((sum, w) => sum + w.content.split(/\s+/).length, 0);
    const avgCreditRate = (activeWorkers.reduce((sum, mid) => {
      const m = APPROVED_MODELS.find(o => o.id === mid);
      const tier = m ? m.tier : "Pro";
      return sum + getModelCreditRate(tier);
    }, 0) + getModelCreditRate(orchObj.tier)) / 4;

    const finalTokens = calculateTokens({
      baseTokens: rawTokens,
      modelMultiplier: avgCreditRate,
      effortMultiplier: getEffortMultiplier(effort),
      envMultiplier: 1.0,
      promptLength: prompt.length,
      modeMultiplier: 3.2, // 3.2x multiplier for Co-Model Mode
    });

    res.json({
      workerThoughts,
      content: finalContent,
      modelId: orchestrator,
      tokensCharged: finalTokens,
    });
  } catch (error: any) {
    console.error("Error in /api/chat/comodel:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// 4. Super Council Mode: 1-20 models consensus & voting
app.post("/api/chat/supercouncil", async (req: Request, res: Response) => {
  try {
    if (!ai) {
      return res.status(503).json({ error: "Gemini API client not initialized." });
    }

    const { prompt, selectedModels = [], modelCount = 12, effort = 60 } = req.body;

    // We can select specific models chosen by the user, or slice by modelCount as fallback
    let selectedList = APPROVED_MODELS.filter((m) => selectedModels.includes(m.id));
    if (selectedList.length === 0) {
      selectedList = APPROVED_MODELS.slice(0, Math.min(20, Math.max(4, modelCount)));
    }

    const effortText = getEffortInstruction(effort);

    // Generate votes & consensus using a structured JSON prompt with Gemini to simulate the votes
    const votingPrompt = `We are running a Super Council of ${selectedList.length} distinct AI models.
The user's query is: "${prompt}"

We need you to act as a Consensus Judge and simulate the individual votes ("YES" or "NO") and short, direct reasons for each of the following ${selectedList.length} models:
${selectedList.map((m) => `- ${m.name} (${m.provider})`).join("\n")}

A vote of "YES" means the model agrees the task/query is clear, feasible, safe, and positive.
A vote of "NO" means the model raises critical red flags, safety concerns, or logical contradictions.

Also, provide a final highly-structured consolidated consensus summary synthesized from all votes.
Note the effort level guidelines for this request: ${effortText}`;

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: votingPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            votes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  modelId: { type: Type.STRING },
                  vote: { type: Type.STRING, description: "YES or NO" },
                  reason: { type: Type.STRING, description: "A 1-sentence explanation representing that model's persona feedback" },
                },
                required: ["modelId", "vote", "reason"],
              }
            },
            consensusSummary: { type: Type.STRING, description: "The final synthesis answer representing the consensus of all models." },
          },
          required: ["votes", "consensusSummary"],
        }
      }
    });

    const parsedData = JSON.parse(result.text?.trim() || "{}");

    // Map modelId back to real model IDs
    const finalVotes = selectedList.map((m, idx) => {
      const rawVote = parsedData?.votes?.[idx] || {};
      return {
        modelId: m.id,
        vote: (rawVote.vote === "NO" ? "NO" : "YES") as "YES" | "NO",
        reason: rawVote.reason || "Acknowledges prompt and confirms alignment with objectives."
      };
    });

    // Calculate tokens for Super Council (Pool C) measured in credits
    const summaryText = parsedData.consensusSummary || "Consensus failed.";
    const rawTokens = summaryText.split(/\s+/).length + 400; // estimated overhead

    // Calculate average credit rate of all participating models in the super council
    const avgCreditRate = selectedList.reduce((sum, m) => {
      return sum + getModelCreditRate(m.tier);
    }, 0) / selectedList.length;

    const finalTokens = calculateTokens({
      baseTokens: rawTokens,
      modelMultiplier: avgCreditRate,
      effortMultiplier: getEffortMultiplier(effort),
      envMultiplier: 1.0,
      promptLength: prompt.length,
      modeMultiplier: 1.2, // Synthesis-only multiplier
    });

    res.json({
      votingDetails: finalVotes,
      content: summaryText,
      tokensCharged: finalTokens,
    });
  } catch (error: any) {
    console.error("Error in /api/chat/supercouncil:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Vite & Static file serving setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Zenith AI full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
