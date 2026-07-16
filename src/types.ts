export interface AIModel {
  id: string;
  name: string;
  provider: string;
  tier: "Free" | "Pro" | "Premium" | "Ultra";
  multiplier: number;
  tag: string;
}

export const APPROVED_MODELS: AIModel[] = [
  { id: "claude-opus-3", name: "Claude Opus 3", provider: "Anthropic", tier: "Premium", multiplier: 1.3, tag: "Reliable Reasoning" },
  { id: "claude-opus-4-1", name: "Claude Opus 4.1", provider: "Anthropic", tier: "Premium", multiplier: 1.3, tag: "Improved Analysis" },
  { id: "claude-opus-4-5", name: "Claude Opus 4.5", provider: "Anthropic", tier: "Premium", multiplier: 1.3, tag: "Better Performance" },
  { id: "claude-opus-4-6", name: "Claude Opus 4.6", provider: "Anthropic", tier: "Premium", multiplier: 1.3, tag: "Excellent Coding" },
  { id: "claude-opus-4-7", name: "Claude Opus 4.7", provider: "Anthropic", tier: "Premium", multiplier: 1.3, tag: "Advanced Problem Solving" },
  { id: "claude-opus-4-8", name: "Claude Opus 4.8", provider: "Anthropic", tier: "Ultra", multiplier: 1.5, tag: "Most Powerful" },
  { id: "fable-5", name: "Fable 5", provider: "Fable", tier: "Ultra", multiplier: 1.5, tag: "Creative Novelty (Needs API Key)" },
  { id: "gpt-5-5", name: "GPT-5.5", provider: "OpenAI", tier: "Ultra", multiplier: 1.5, tag: "Ultra Intelligence" },
  { id: "gemini-3-1-pro-preview", name: "Gemini 3.1 Pro", provider: "Google", tier: "Ultra", multiplier: 1.5, tag: "Advanced Multimodal" },
  { id: "claude-sonnet-5", name: "Claude Sonnet 5", provider: "Anthropic", tier: "Ultra", multiplier: 1.5, tag: "Hyper-Reasoning" },
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "Anthropic", tier: "Pro", multiplier: 1.0, tag: "Best Balance" },
  { id: "claude-4-sonnet", name: "Claude 4 Sonnet", provider: "Anthropic", tier: "Pro", multiplier: 1.0, tag: "Popular Choice" },
  { id: "gpt-5-1-codex-max", name: "GPT-5.1 Codex Max", provider: "OpenAI", tier: "Premium", multiplier: 1.3, tag: "Long Coding Tasks" },
  { id: "gpt-4-1", name: "GPT-4.1", provider: "OpenAI", tier: "Pro", multiplier: 1.0, tag: "Reliable General" },
  { id: "gemini-2-5-pro", name: "Gemini 2.5 Pro", provider: "Google", tier: "Premium", multiplier: 1.3, tag: "Research & Analysis" },
  { id: "gemini-3-1", name: "Gemini 3.1", provider: "Google", tier: "Pro", multiplier: 1.0, tag: "Top Tier Reasoning" },
  { id: "deepseek-v3-2", name: "DeepSeek V3.2", provider: "DeepSeek", tier: "Premium", multiplier: 1.3, tag: "Best Value Coding" },
  { id: "deepseek-r1", name: "DeepSeek R1", provider: "DeepSeek", tier: "Pro", multiplier: 1.0, tag: "Multi-Step Reasoning" },
  { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", provider: "DeepSeek", tier: "Free", multiplier: 0.7, tag: "Budget Friendly" },
  { id: "qwen3-coder", name: "Qwen3 Coder", provider: "Alibaba", tier: "Pro", multiplier: 1.0, tag: "Top Coding Model" },
  { id: "qwen3-235b", name: "Qwen3 235B", provider: "Alibaba", tier: "Premium", multiplier: 1.3, tag: "Advanced Reasoning" },
  { id: "qwen-2-5-72b", name: "Qwen 2.5 72B", provider: "Alibaba", tier: "Pro", multiplier: 1.0, tag: "Multilingual Support" },
  { id: "llama-4-maverick", name: "Llama 4 Maverick", provider: "Meta", tier: "Pro", multiplier: 1.0, tag: "Community Favorite" },
  { id: "llama-4-maverick-free", name: "Llama 4 Maverick (Free)", provider: "Meta", tier: "Free", multiplier: 0.7, tag: "Zero Cost" },
  { id: "llama-3-3-70b-instruct", name: "Llama 3.3 70B Instruct", provider: "Meta", tier: "Pro", multiplier: 1.0, tag: "General Purpose" },
  { id: "llama-3-70b-base", name: "Llama 3 70B Base", provider: "Meta", tier: "Pro", multiplier: 1.0, tag: "Base Model Experiments" },
  { id: "code-llama", name: "Code Llama", provider: "Meta", tier: "Pro", multiplier: 1.0, tag: "Code Focused" },
  { id: "mistral-small-3", name: "Mistral Small 3", provider: "Mistral", tier: "Free", multiplier: 0.7, tag: "Fast Processing" },
  { id: "mistral-devstral-small", name: "Mistral Devstral Small", provider: "Mistral", tier: "Free", multiplier: 0.7, tag: "Dev Tuned" },
  { id: "minimax-m2", name: "MiniMax M2", provider: "MiniMax", tier: "Pro", multiplier: 1.0, tag: "Cost Performance" },
  { id: "glm-4-5-air", name: "GLM-4.5 Air", provider: "Zhipu", tier: "Pro", multiplier: 1.0, tag: "Structured Output" },
  { id: "deepcoder-14b", name: "DeepCoder-14B", provider: "DeepCode", tier: "Free", multiplier: 0.7, tag: "Lightweight Coding" },
  { id: "dolphin-3-0", name: "Dolphin 3.0", provider: "Eric Hartford", tier: "Pro", multiplier: 1.0, tag: "Balanced Behavior" },
  { id: "quasar-alpha", name: "Quasar Alpha", provider: "Quasar", tier: "Pro", multiplier: 1.0, tag: "Real-time Agents" },
  { id: "nvidia-nemotron-3", name: "NVIDIA Nemotron 3", provider: "NVIDIA", tier: "Free", multiplier: 0.7, tag: "Open Model" },
  { id: "owl-alpha", name: "Owl Alpha", provider: "Owl Labs", tier: "Free", multiplier: 0.7, tag: "Top Free Model" },
  { id: "gpt-oss-120b", name: "GPT-OSS 120B", provider: "Open Source", tier: "Free", multiplier: 0.7, tag: "Open Source" },
  { id: "tng-r1t-chimera", name: "TNG-R1T-Chimera", provider: "TNG", tier: "Pro", multiplier: 1.0, tag: "Creative Agents" },
];

export interface ChatMessage {
  id: string;
  sender: "user" | "ai" | "system";
  content: string;
  timestamp: string;
  modelId?: string;
  citations?: string[];
  workerThoughts?: { name: string; content: string }[]; // for Co-Model Mode
  votingDetails?: { modelId: string; vote: "YES" | "NO"; reason: string }[]; // for Super Council Mode
  consensusSummary?: string;
  councilResponses?: { modelId: string; content: string }[]; // for Council Mode
}

export interface ChatSession {
  id: string;
  name: string;
  mode: "normal" | "council" | "comodel" | "dev" | "smode" | "supercouncil";
  messages: ChatMessage[];
  selectedModels: string[]; // up to 4 for council, 3 workers + 1 orchestra for co-model, up to 20 for super-council
  createdAt?: string;
  lastAccessedAt?: string;
  isPermanent?: boolean;
  files?: SModeFile[];
}

export interface SModeFile {
  id: string;
  name: string;
  size: number;
  type: string;
  contentSnippet: string;
}

export interface UsagePools {
  poolA: { used: number; limit: number }; // Normal, Council, Dev, S-mode
  poolB: { used: number; limit: number }; // Co-Model
  poolC: { used: number; limit: number }; // Super Council
  windowStart: string;
  windowEnd: string;
}

export type PricingTier = "free" | "pro" | "max" | "ultra" | "ultrapromax";

export const TIER_LIMITS: Record<PricingTier, { poolA: number; poolB: number; poolC: number }> = {
  free: { poolA: 8000, poolB: 0, poolC: 0 },
  pro: { poolA: 100000, poolB: 50000, poolC: 75000 },
  max: { poolA: 250000, poolB: 120000, poolC: 200000 },
  ultra: { poolA: 500000, poolB: 250000, poolC: 400000 },
  ultrapromax: { poolA: 1000000, poolB: 500000, poolC: 800000 },
};

export const CREDIT_RATES = {
  low: 1, // low end models = 1 credit / token
  mid: 9, // mid models = 9 credits / token
  high: 19, // high models = 19 credits / token
};
