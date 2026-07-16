import React, { useState, useRef, useEffect, useMemo } from "react";
import { APPROVED_MODELS, ChatMessage, ChatSession, SModeFile, UsagePools } from "../types.js";
import {
  Send,
  Sliders,
  Sparkles,
  Layers,
  Terminal,
  FileCode,
  Users,
  ChevronDown,
  Paperclip,
  Trash2,
  Copy,
  Check,
  Plus,
  Loader2,
  ThumbsUp,
  Award,
  BookOpen,
  Vote,
  Compass,
  CornerDownRight,
  ShieldAlert,
  X,
} from "lucide-react";

interface ChatWorkspaceProps {
  key?: string;
  usage: UsagePools;
  onUsageUpdate: (pool: "poolA" | "poolB" | "poolC", tokens: number) => void;
  isDevMode: boolean;
  setIsDevMode: (val: boolean) => void;
  activeSession: ChatSession;
  onUpdateSession: (session: ChatSession) => void;
  currentTier: string;
  userProfile?: any;
  isPhoneFrame?: boolean;
  apiBaseUrl?: string;
}

export default function ChatWorkspace({
  usage,
  onUsageUpdate,
  isDevMode,
  setIsDevMode,
  activeSession,
  onUpdateSession,
  currentTier,
  userProfile,
  isPhoneFrame = false,
  apiBaseUrl = "",
}: ChatWorkspaceProps) {
  const [inputText, setInputText] = useState("");
  const [effort, setEffort] = useState(60);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // S-Mode Upload State
  const [smodeFiles, setSmodeFiles] = useState<SModeFile[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (uploadError) {
      const timer = setTimeout(() => setUploadError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [uploadError]);

  const getFileLimit = (mode: string, tier: string) => {
    const isSMode = mode === "smode";
    if (!isSMode) {
      return { limitBytes: 25 * 1024 * 1024, label: "25MB" };
    }
    
    switch (tier) {
      case "free":
        return { limitBytes: 50 * 1024 * 1024, label: "50MB" };
      case "pro":
        return { limitBytes: 250 * 1024 * 1024, label: "250MB" };
      case "max":
        return { limitBytes: 500 * 1024 * 1024 * 1024, label: "500GB" };
      case "ultra":
        return { limitBytes: 1024 * 1024 * 1024, label: "1GB" };
      case "ultrapromax":
        return { limitBytes: 5 * 1024 * 1024 * 1024, label: "5GB" };
      default:
        return { limitBytes: 50 * 1024 * 1024, label: "50MB" };
    }
  };

  // Selected Models for different modes
  const [normalModel, setNormalModel] = useState("claude-sonnet-4-6");
  const [councilModels, setCouncilModels] = useState<string[]>([
    "claude-sonnet-4-6",
    "gpt-4-1",
    "gemini-3-1",
  ]);
  const [comodelWorkers, setComodelWorkers] = useState<string[]>([
    "claude-sonnet-4-6",
    "gpt-4-1",
    "deepseek-r1",
  ]);
  const [comodelOrchestrator, setComodelOrchestrator] = useState("claude-opus-4-8");
  const [superCouncilModels, setSuperCouncilModels] = useState<string[]>([
    "claude-opus-4-6",
    "gpt-5-1-codex-max",
    "gemini-3-1",
    "deepseek-r1",
    "llama-4-maverick",
    "mistral-small-3",
  ]);
  const [superCouncilCount, setSuperCouncilCount] = useState(12);

  // Dev sidebar state
  const [showDevSidebar, setShowDevSidebar] = useState(true);
  const [selectedDevFile, setSelectedDevFile] = useState<string | null>(null);

  // Generic Slot/Model Picker dropdown status
  const [activePickerSlot, setActivePickerSlot] = useState<{
    type: "council" | "comodel-worker" | "comodel-orchestrator" | "supercouncil";
    index?: number;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const greetingText = useMemo(() => {
    if (activeSession.mode !== "normal") return "Beginning of Chat Thread";
    const greetings = ['Welcome', 'Back at it', 'What for today', 'Ready to dive in'];
    // Deterministic selection based on stable activeSession.id
    let hash = 0;
    const idStr = activeSession.id || "";
    for (let i = 0; i < idStr.length; i++) {
      hash += idStr.charCodeAt(i);
    }
    const index = hash % greetings.length;
    return `${greetings[index]}, ${userProfile?.displayName || "Explorer"}!`;
  }, [activeSession.id, activeSession.mode, userProfile?.displayName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession.messages, loading]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // S-Mode File Uploader drag-and-drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const processFile = (file: File) => {
    const limitInfo = getFileLimit(activeSession.mode, currentTier);
    if (file.size > limitInfo.limitBytes) {
      setUploadError(`File is too large! Maximum limit is ${limitInfo.label} in ${activeSession.mode === 'smode' ? 'Smart File Mode' : 'this mode'}.`);
      return;
    }
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || "";
      const contentSnippet = text.slice(0, 1500) + (text.length > 1500 ? "\n... [TRUNCATED] ..." : "");
      const newFile: SModeFile = {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        size: file.size,
        type: file.type || "text/plain",
        contentSnippet,
      };
      
      if (activeSession.mode === "smode") {
        const updated = {
          ...activeSession,
          files: [...(activeSession.files || []), newFile],
        };
        onUpdateSession(updated);
      } else {
        setSmodeFiles((prev) => [...prev, newFile]);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const removeFile = (id: string) => {
    if (activeSession.mode === "smode") {
      const updated = {
        ...activeSession,
        files: (activeSession.files || []).filter((f) => f.id !== id),
      };
      onUpdateSession(updated);
    } else {
      setSmodeFiles((prev) => prev.filter((f) => f.id !== id));
    }
  };

  // Send message implementation
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userText = inputText.trim();
    setInputText("");

    // Add user message locally
    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      sender: "user",
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedSession = {
      ...activeSession,
      messages: [...activeSession.messages, userMsg],
    };
    onUpdateSession(updatedSession);
    setLoading(true);

    try {
      if (activeSession.mode === "normal" || activeSession.mode === "dev" || activeSession.mode === "smode") {
        // Enforce lock checking
        if (usage.poolA.used >= usage.poolA.limit) {
          throw new Error("Pool A quota completely exhausted for this 5-hour window!");
        }

        const res = await fetch(`${apiBaseUrl}/api/chat/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelId: isDevMode ? "claude-opus-4-6" : normalModel,
            prompt: userText,
            effort,
            isDevMode: activeSession.mode === "dev",
            isSMode: activeSession.mode === "smode",
            files: activeSession.mode === "smode" ? (activeSession.files || []) : smodeFiles,
            userProfile,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to reach endpoint");

        const aiMsg: ChatMessage = {
          id: Math.random().toString(36).substring(7),
          sender: "ai",
          content: data.content,
          modelId: data.modelId,
          citations: data.citations,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        onUpdateSession({
          ...updatedSession,
          messages: [...updatedSession.messages, aiMsg],
        });

        // Update Pool A tokens
        onUsageUpdate("poolA", data.tokensCharged);

      } else if (activeSession.mode === "council") {
        if (usage.poolA.used >= usage.poolA.limit) {
          throw new Error("Pool A quota exhausted for this 5-hour window!");
        }

        const res = await fetch(`${apiBaseUrl}/api/chat/council`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedModels: councilModels,
            prompt: userText,
            effort,
            userProfile,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to reach endpoint");

        const aiMsg: ChatMessage = {
          id: Math.random().toString(36).substring(7),
          sender: "ai",
          content: `Simultaneous Council response complete. Evaluated against ${councilModels.length} models side-by-side.`,
          councilResponses: data.councilResponses,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        onUpdateSession({
          ...updatedSession,
          messages: [...updatedSession.messages, aiMsg],
        });

        onUsageUpdate("poolA", data.tokensCharged);

      } else if (activeSession.mode === "comodel") {
        if (usage.poolB.used >= usage.poolB.limit && currentTier !== "ultrapromax") {
          throw new Error("Pool B (Co-Model) quota exhausted! Buy token packs to unlock.");
        }

        const res = await fetch(`${apiBaseUrl}/api/chat/comodel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workers: comodelWorkers,
            orchestrator: comodelOrchestrator,
            prompt: userText,
            effort,
            userProfile,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to reach endpoint");

        const aiMsg: ChatMessage = {
          id: Math.random().toString(36).substring(7),
          sender: "ai",
          content: data.content,
          modelId: data.modelId,
          workerThoughts: data.workerThoughts,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        onUpdateSession({
          ...updatedSession,
          messages: [...updatedSession.messages, aiMsg],
        });

        onUsageUpdate("poolB", data.tokensCharged);

      } else if (activeSession.mode === "supercouncil") {
        if (usage.poolC.used >= usage.poolC.limit && currentTier !== "ultrapromax") {
          throw new Error("Pool C (Super Council) quota exhausted!");
        }

        const res = await fetch(`${apiBaseUrl}/api/chat/supercouncil`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: userText,
            selectedModels: superCouncilModels,
            modelCount: superCouncilModels.length,
            effort,
            userProfile,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to reach endpoint");

        const aiMsg: ChatMessage = {
          id: Math.random().toString(36).substring(7),
          sender: "ai",
          content: data.content,
          votingDetails: data.votingDetails,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        onUpdateSession({
          ...updatedSession,
          messages: [...updatedSession.messages, aiMsg],
        });

        onUsageUpdate("poolC", data.tokensCharged);
      }
    } catch (err: any) {
      console.error(err);
      const systemErrorMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        sender: "system",
        content: `ERROR: ${err.message || "An unexpected error occurred processing your request."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      onUpdateSession({
        ...updatedSession,
        messages: [...updatedSession.messages, systemErrorMsg],
      });
    } finally {
      setLoading(false);
      setSmodeFiles([]);
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "council":
        return <Users className="w-4 h-4 text-[#00E5FF]" />;
      case "comodel":
        return <Layers className="w-4 h-4 text-[#FF2DAA]" />;
      case "dev":
        return <Terminal className="w-4 h-4 text-[#39FF14]" />;
      case "smode":
        return <FileCode className="w-4 h-4 text-orange-400" />;
      case "supercouncil":
        return <Vote className="w-4 h-4 text-purple-400" />;
      default:
        return <Compass className="w-4 h-4 text-gray-300" />;
    }
  };

  // Accordion / thought drawer state
  const [openThoughts, setOpenThoughts] = useState<Record<string, boolean>>({});

  return (
    <div id="chat-workspace-component" className="flex-1 flex flex-col h-full bg-[#0B0D17] text-white overflow-hidden relative">
      {/* Mode Header */}
      <div className="p-2 sm:p-2.5 bg-[#0E1121] border-b border-gray-850 flex items-center justify-between gap-1.5 sm:gap-2 z-10 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {/* Action Toggle if normal/dev */}
          {activeSession.mode === "normal" && (
            <div className="flex items-center gap-1 sm:gap-1.5 bg-gray-950 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border border-gray-800 min-w-0">
              <span className="text-[8px] sm:text-[9px] font-mono text-gray-500 uppercase tracking-wider flex-shrink-0">Model:</span>
              <select
                value={normalModel}
                onChange={(e) => setNormalModel(e.target.value)}
                className="bg-transparent font-mono font-bold text-[10px] sm:text-xs text-[#39FF14] focus:outline-none cursor-pointer truncate max-w-[95px] xs:max-w-[130px] sm:max-w-none"
              >
                {APPROVED_MODELS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#0B0D17] text-white">
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-gray-950 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border border-gray-800 min-w-0 flex-shrink-0">
          <span className="text-[8px] sm:text-[9px] font-mono text-gray-500 uppercase tracking-wider flex-shrink-0">Mode:</span>
          <select
            value={activeSession.mode}
            onChange={(e) => {
              const newMode = e.target.value as any;
              onUpdateSession({
                ...activeSession,
                mode: newMode,
                name: activeSession.name.includes("Session")
                  ? `${newMode.toUpperCase()} Session #${activeSession.id.slice(-3)}`
                  : activeSession.name,
                selectedModels: newMode === "council" && (!activeSession.selectedModels || activeSession.selectedModels.length < 3)
                  ? ["claude-opus-4-6", "gpt-5-1-codex-max", "gemini-3-1"]
                  : activeSession.selectedModels || ["claude-sonnet-4-6"]
              });
            }}
            className="bg-transparent font-mono font-bold text-[10px] sm:text-xs text-[#00E5FF] focus:outline-none cursor-pointer truncate max-w-[95px] xs:max-w-[130px] sm:max-w-none"
          >
            <option value="normal" className="bg-[#0B0D17] text-white">Normal</option>
            <option value="council" className="bg-[#0B0D17] text-white">Council</option>
            <option value="comodel" className="bg-[#0B0D17] text-white">Co-Model</option>
            <option value="dev" className="bg-[#0B0D17] text-white">Dev Sandbox</option>
            <option value="smode" className="bg-[#0B0D17] text-white">Smart File (S-Mode)</option>
            <option value="supercouncil" className="bg-[#0B0D17] text-white">Super Council</option>
          </select>
        </div>
      </div>

      {/* Mode Config Panel */}
      <div className="px-3 py-2 bg-[#0C0F1D] border-b border-gray-850 flex flex-col gap-2 z-10">
        {activeSession.mode === "council" && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
              Council Models (Compare exactly 3)
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((slotIdx) => (
                <div key={slotIdx} className="p-2 bg-gray-950 border border-gray-850 rounded-lg flex flex-col gap-1">
                  <span className="text-[9px] font-mono text-gray-500 font-bold">SLOT {slotIdx + 1}</span>
                  <select
                    value={councilModels[slotIdx] || ""}
                    onChange={(e) => {
                      const updated = [...councilModels];
                      updated[slotIdx] = e.target.value;
                      setCouncilModels(updated);
                    }}
                    className="bg-transparent text-[11px] font-mono text-cyan-300 font-semibold focus:outline-none w-full border-none cursor-pointer"
                  >
                    {APPROVED_MODELS.map((m) => (
                      <option key={m.id} value={m.id} className="bg-[#0B0D17]">
                        {m.name} ({m.provider})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSession.mode === "comodel" && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-4 gap-2">
              {/* 3 Workers */}
              {[0, 1, 2].map((slotIdx) => (
                <div key={slotIdx} className="p-2 bg-gray-950 border border-gray-850 rounded-lg flex flex-col gap-1">
                  <span className="text-[9px] font-mono text-pink-400 font-bold">WORKER {slotIdx + 1}</span>
                  <select
                    value={comodelWorkers[slotIdx] || ""}
                    onChange={(e) => {
                      const updated = [...comodelWorkers];
                      updated[slotIdx] = e.target.value;
                      setComodelWorkers(updated);
                    }}
                    className="bg-transparent text-[11px] font-mono text-pink-300 font-semibold focus:outline-none w-full border-none cursor-pointer"
                  >
                    {APPROVED_MODELS.map((m) => (
                      <option key={m.id} value={m.id} className="bg-[#0B0D17]">
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              {/* 1 Orchestrator */}
              <div className="p-2 bg-gray-950 border border-pink-500/30 rounded-lg flex flex-col gap-1">
                <span className="text-[9px] font-mono text-white font-bold uppercase tracking-wide">Orchestrator</span>
                <select
                  value={comodelOrchestrator}
                  onChange={(e) => setComodelOrchestrator(e.target.value)}
                  className="bg-transparent text-[11px] font-mono text-purple-300 font-bold focus:outline-none w-full border-none cursor-pointer"
                >
                  <option value="claude-opus-4-8" className="bg-[#0B0D17]">Opus 4.8</option>
                  <option value="fable-5" className="bg-[#0B0D17]">Fable 5</option>
                  <option value="gpt-5-5" className="bg-[#0B0D17]">GPT-5.5</option>
                  <option value="gemini-3-1-pro-preview" className="bg-[#0B0D17]">Gemini 3.1 Pro</option>
                  <option value="claude-sonnet-5" className="bg-[#0B0D17]">Sonnet 5</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeSession.mode === "supercouncil" && (
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-wider">
                Select Super Council Models ({superCouncilModels.length} active)
              </span>
              <span className="text-[9px] font-mono text-gray-500">
                Choose any number of models (more than 3)
              </span>
            </div>
            {/* Horizontal Scrolling Quick Selector */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {APPROVED_MODELS.map((m) => {
                const isActive = superCouncilModels.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      if (isActive) {
                        if (superCouncilModels.length > 3) {
                          setSuperCouncilModels(superCouncilModels.filter((id) => id !== m.id));
                        }
                      } else {
                        setSuperCouncilModels([...superCouncilModels, m.id]);
                      }
                    }}
                    className={`px-2.5 py-1 text-[10px] font-mono rounded-full border transition-all flex-shrink-0 flex items-center gap-1 cursor-pointer ${
                      isActive
                        ? "bg-purple-950/40 text-purple-300 border-purple-500/40 font-bold"
                        : "bg-gray-950 text-gray-500 border-gray-850 hover:text-gray-300"
                    }`}
                  >
                    <span>{isActive ? "●" : "○"}</span>
                    <span>{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeSession.mode === "smode" && (
          <div className="flex items-center justify-between text-[11px] font-mono text-orange-400 bg-orange-950/10 border border-orange-500/20 rounded-lg px-2.5 py-1.5">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
              <span>SMART STORAGE (S-MODE) ACTIVE</span>
            </span>
            <span className="text-gray-500 text-[10px]">
              {activeSession.files?.length || 0} files stored persistently in chat
            </span>
          </div>
        )}

        {activeSession.mode === "dev" && (
          <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400 bg-emerald-950/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>DEV MODULE ACTIVE — 50% CREDIT DISCOUNT</span>
            </span>
            <button
              type="button"
              onClick={() => setShowDevSidebar(!showDevSidebar)}
              className="text-[10px] font-bold bg-emerald-950/55 text-emerald-300 hover:text-white px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1 cursor-pointer transition-all"
            >
              <Terminal className="w-3 h-3" />
              <span>{showDevSidebar ? "HIDE SIDEBAR" : "SHOW SIDEBAR"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Split-screen layout for Dev Mode right-hand sidebar alongside Chat workspace */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        
        {/* Left pane: Active chat workspace */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          
          {/* Messages Scroll Area */}
          <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${activeSession.mode === "dev" ? "font-mono bg-black text-[#39FF14]" : "bg-[#080A12]"}`}>
            {activeSession.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="p-4 bg-gray-950/50 border border-gray-850 rounded-2xl animate-pulse">
                  {getModeIcon(activeSession.mode)}
                </div>
                <h3 className="font-display font-semibold text-sm text-gray-300">
                  {greetingText}
                </h3>
                <p className="text-xs text-gray-500 max-w-xs leading-normal">
                  Type your query below. All requests consume tokens from your universal rolling quotas.
                </p>
              </div>
            ) : (
              activeSession.messages.map((msg) => {
                const isUser = msg.sender === "user";
                const isSystem = msg.sender === "system";

                if (isSystem) {
                  return (
                    <div key={msg.id} className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl flex gap-2">
                      <span className="text-xs font-mono text-red-400 font-bold">SYS:</span>
                      <p className="text-xs text-red-300 leading-normal">{msg.content}</p>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1.5`}
                  >
                    {/* Sender Pill */}
                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-gray-500 px-1">
                      {!isUser && msg.modelId && (
                        <span className="text-cyan-400 font-bold">
                          [{APPROVED_MODELS.find((m) => m.id === msg.modelId)?.name || msg.modelId}]
                        </span>
                      )}
                      <span>{isUser ? "YOU" : "ZENITH GATEWAY"}</span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    {/* Message Box */}
                    <div
                      className={`p-3.5 rounded-2xl max-w-[88%] text-xs leading-normal relative group ${
                        isUser
                          ? "bg-gradient-to-br from-[#00E5FF]/25 to-blue-950/40 border border-[#00E5FF]/20 text-white rounded-tr-none"
                          : activeSession.mode === "dev"
                          ? "bg-gray-950 border border-[#39FF14]/30 text-[#39FF14] font-mono rounded-tl-none"
                          : "bg-[#0E1121] border border-gray-850 text-gray-200 rounded-tl-none shadow-md"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {/* S-Mode Citations */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-gray-800/80 flex flex-wrap gap-1.5">
                          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block w-full">
                            Attached Citations:
                          </span>
                          {msg.citations.map((cite, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-orange-950/40 text-orange-400 text-[10px] font-mono border border-orange-500/20"
                            >
                              [Source: {cite}]
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Expandable Brainstorm Thoughts (Co-Model Mode) */}
                      {msg.workerThoughts && (
                        <div className="mt-4 pt-3 border-t border-gray-850 space-y-2">
                          <span className="text-[10px] font-mono text-pink-400 font-bold block uppercase tracking-wider flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5" />
                            SPECIALIST THINKING LOOPS
                          </span>

                          {msg.workerThoughts.map((thought, i) => {
                            const isOpen = openThoughts[`${msg.id}-${i}`];
                            return (
                              <div key={i} className="bg-gray-950/60 rounded-lg border border-gray-850 overflow-hidden text-[11px]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenThoughts((prev) => ({
                                      ...prev,
                                      [`${msg.id}-${i}`]: !isOpen,
                                    }))
                                  }
                                  className="w-full px-3 py-2 flex items-center justify-between font-mono font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
                                >
                                  <span className="flex items-center gap-1.5 text-gray-300">
                                    <CornerDownRight className="w-3 h-3 text-[#FF2DAA]" />
                                    {thought.name}
                                  </span>
                                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                                </button>
                                {isOpen && (
                                  <div className="px-3 pb-3 pt-1 border-t border-gray-850/50 text-gray-400 leading-relaxed whitespace-pre-wrap font-sans">
                                    {thought.content}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Interactive Consensus Matrix (Super Council Mode) */}
                      {msg.votingDetails && (
                        <div className="mt-4 pt-3 border-t border-gray-850 space-y-2">
                          <span className="text-[10px] font-mono text-purple-400 font-bold block uppercase tracking-wider flex items-center gap-1">
                            <Vote className="w-3.5 h-3.5" />
                            SUPER COUNCIL CONSENSUS MATRIX
                          </span>

                          <div className="border border-gray-850 rounded-xl overflow-hidden bg-gray-950/80 max-h-[160px] overflow-y-auto">
                            <table className="w-full text-left border-collapse text-[10px] font-mono">
                              <thead>
                                <tr className="bg-gray-900 border-b border-gray-850 text-gray-500 font-bold">
                                  <th className="p-2">Model</th>
                                  <th className="p-2 text-center">Vote</th>
                                  <th className="p-2">Reason</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-850">
                                {msg.votingDetails.map((vote, i) => {
                                  const mdl = APPROVED_MODELS.find((m) => m.id === vote.modelId);
                                  return (
                                    <tr key={i} className="hover:bg-gray-900/45">
                                      <td className="p-2 font-bold text-gray-300">{mdl?.name || vote.modelId}</td>
                                      <td className="p-2 text-center">
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                            vote.vote === "YES"
                                              ? "bg-emerald-950/50 text-emerald-400 border border-emerald-500/20"
                                              : "bg-red-950/50 text-red-400 border border-red-500/20"
                                          }`}
                                        >
                                          {vote.vote}
                                        </span>
                                      </td>
                                      <td className="p-2 text-gray-400 max-w-[140px] truncate">{vote.reason}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Side-by-Side Council Responses Grid */}
                      {msg.councilResponses && (
                        <div className="mt-4 pt-3 border-t border-gray-850 space-y-3">
                          <span className="text-[10px] font-mono text-cyan-400 font-bold block uppercase tracking-wider flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            COUNCIL GRID INFERENCE RESPONSES
                          </span>

                          <div className="grid grid-cols-2 gap-2">
                            {msg.councilResponses.map((res, i) => {
                              const mdl = APPROVED_MODELS.find((m) => m.id === res.modelId);
                              return (
                                <div key={i} className="bg-gray-950 p-2.5 rounded-xl border border-gray-850 flex flex-col justify-between space-y-2">
                                  <div>
                                    <span className="text-[9px] font-mono font-bold text-cyan-400 uppercase tracking-wider block border-b border-gray-900 pb-1">
                                      {mdl?.name || res.modelId}
                                    </span>
                                    <p className="text-[10px] text-gray-300 leading-normal mt-1.5 whitespace-pre-wrap line-clamp-6 hover:line-clamp-none transition-all duration-300">
                                      {res.content}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(res.content, `${msg.id}-${i}`)}
                                    className="text-[9px] font-mono text-gray-500 hover:text-white flex items-center gap-1 self-end bg-gray-900 px-1.5 py-0.5 rounded border border-gray-850 cursor-pointer"
                                  >
                                    {copiedId === `${msg.id}-${i}` ? <Check className="w-2.5 h-2.5 text-[#39FF14]" /> : <Copy className="w-2.5 h-2.5" />}
                                    {copiedId === `${msg.id}-${i}` ? "COPIED" : "COPY"}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Bottom Message bar copy utility */}
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-950 border border-gray-800 p-1 rounded-lg text-gray-400 hover:text-white cursor-pointer"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-[#39FF14]" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {/* Loading Spinner */}
            {loading && (
              <div className="flex flex-col items-start space-y-1.5 animate-pulse">
                <span className="text-[9px] font-mono text-gray-500">ZENITH GATEWAY IS COMPUTING...</span>
                <div className="p-4 bg-[#0E1121] border border-gray-850 rounded-2xl rounded-tl-none flex items-center gap-2.5 text-xs text-gray-400 max-w-[280px]">
                  <Loader2 className="w-4 h-4 text-[#00E5FF] animate-spin" />
                  <span>Orchestrating model consensus...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Universal hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept=".txt,.js,.ts,.tsx,.json,.md,.html,.css"
          />

          {/* Control Drawer / Configuration bar */}
          <div className="px-3 py-2 bg-[#11152B] border-t border-gray-850 flex items-center gap-3">
            {/* Effort level controls */}
            <div className="flex-1 flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-[10px] font-mono text-gray-400">Effort:</span>
              <input
                type="range"
                min="0"
                max="4"
                step="1"
                value={
                  effort === 20 ? 0 :
                  effort === 40 ? 1 :
                  effort === 60 ? 2 :
                  effort === 80 ? 3 :
                  effort === 100 ? 4 : 2
                }
                onChange={(e) => {
                  const values = [20, 40, 60, 80, 100];
                  setEffort(values[Number(e.target.value)]);
                }}
                className="flex-1 accent-[#FF2DAA] h-1 bg-gray-850 rounded-lg cursor-pointer"
              />
              <span className={`text-[10px] font-mono font-bold w-16 text-right tracking-wider ${
                effort === 20 ? "text-gray-400" :
                effort === 40 ? "text-blue-400" :
                effort === 60 ? "text-green-400" :
                effort === 80 ? "text-orange-400" : "text-pink-500"
              }`}>
                {effort === 20 ? "LOW" :
                 effort === 40 ? "MEDIUM" :
                 effort === 60 ? "HIGH" :
                 effort === 80 ? "EXTRA" : "MAX"}
              </span>
            </div>

            {/* Super Council slider */}
            {activeSession.mode === "supercouncil" && (
              <div className="flex items-center gap-1.5 bg-gray-950 px-2 py-1 rounded-lg border border-gray-850">
                <span className="text-[9px] font-mono text-gray-500">Models:</span>
                <select
                  value={superCouncilCount}
                  onChange={(e) => setSuperCouncilCount(Number(e.target.value))}
                  className="bg-transparent font-mono font-bold text-xs text-white focus:outline-none cursor-pointer"
                >
                  {[4, 8, 12, 16, 20].map((num) => (
                    <option key={num} value={num} className="bg-[#0B0D17]">
                      {num}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Input Box Form & Upload Tray Overlay (Compact) */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="p-3 bg-[#0E1121] border-t border-gray-850 flex flex-col gap-2"
          >
            {/* Upload errors */}
            {uploadError && (
              <div className="p-2 bg-red-950/40 border border-red-500/20 text-red-400 text-[10px] rounded-lg font-mono flex items-center gap-1.5 animate-fade-in">
                <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 text-red-400" />
                <span className="flex-1 text-left">{uploadError}</span>
                <button type="button" onClick={() => setUploadError(null)} className="font-bold text-gray-400 hover:text-white px-1">✕</button>
              </div>
            )}

            {/* Attached files as small clean pill-chips */}
            {(() => {
              const currentFiles = activeSession.mode === "smode" ? (activeSession.files || []) : smodeFiles;
              if (currentFiles.length === 0) return null;
              return (
                <div className="flex flex-wrap gap-1.5 max-h-[70px] overflow-y-auto pb-1">
                  {currentFiles.map((f) => (
                    <div
                      key={f.id}
                      className="px-2 py-0.5 bg-gray-950 border border-gray-800 rounded-lg flex items-center gap-1.5 text-[10px] font-mono text-gray-300 animate-fade-in"
                    >
                      <span className="truncate max-w-[140px]">{f.name}</span>
                      <span className="text-gray-600">({Math.round(f.size / 1024)}K)</span>
                      <button
                        type="button"
                        onClick={() => removeFile(f.id)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}

            <form onSubmit={handleSend} className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl bg-gray-950 hover:bg-gray-900 border border-gray-800 text-gray-400 hover:text-[#00E5FF] flex items-center justify-center transition-colors cursor-pointer"
                title="Attach Files"
              >
                <Plus className="w-4 h-4" />
              </button>
              <input
                type="text"
                placeholder={
                  activeSession.mode === "smode" && (activeSession.files || []).length === 0
                    ? "Attach file context with (+) first..."
                    : `Prompt Zenith Council (${activeSession.mode} mode)...`
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-xs focus:outline-none focus:border-[#00E5FF] text-white placeholder-gray-500 font-sans"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || loading}
                className="p-2.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#FF2DAA] hover:opacity-90 transition-all text-white flex items-center justify-center cursor-pointer shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>

        {/* Right Pane: Dev Mode Sandbox / Generated Files Sidebar */}
        {activeSession.mode === "dev" && showDevSidebar && (
          <div className={`bg-[#070911] flex flex-col h-full overflow-hidden font-mono text-[11px] ${
            isPhoneFrame
              ? "absolute inset-0 z-30 w-full"
              : "w-[340px] border-l border-gray-850"
          }`}>
            {/* Sidebar Title */}
            <div className="p-3 bg-gray-950/80 border-b border-gray-850 flex items-center justify-between text-[#39FF14]">
              <span className="font-bold flex items-center gap-1.5">
                <Terminal className="w-4 h-4 animate-pulse" />
                <span>DEV SANDBOX STORAGE</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded">
                  LIVE PARSER
                </span>
                {isPhoneFrame && (
                  <button
                    type="button"
                    onClick={() => setShowDevSidebar(false)}
                    className="p-1 hover:text-white text-gray-400 transition-colors cursor-pointer animate-fade-in"
                    title="Close Sidebar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {(() => {
              const parsedFiles = (() => {
                const list: { name: string; content: string; language: string }[] = [];
                let fallbackCounter = 1;

                activeSession.messages.forEach((msg) => {
                  if (msg.sender !== "ai") return;
                  // Look for markdown codeblocks with language names or filenames
                  const regex = /```(\w+)?(?:\s+name="([^"]+)"|\s+filename="([^"]+)")?\n([\s\S]*?)```/g;
                  let match;
                  while ((match = regex.exec(msg.content)) !== null) {
                    const lang = match[1] || "txt";
                    const name = match[2] || match[3] || `module_${fallbackCounter++}.${lang === "typescript" ? "ts" : lang === "javascript" ? "js" : lang === "python" ? "py" : lang}`;
                    const content = match[4].trim();

                    const existingIdx = list.findIndex((f) => f.name === name);
                    if (existingIdx > -1) {
                      list[existingIdx] = { name, content, language: lang };
                    } else {
                      list.push({ name, content, language: lang });
                    }
                  }
                });
                return list;
              })();

              const activeFile = selectedDevFile ? parsedFiles.find((f) => f.name === selectedDevFile) || parsedFiles[0] : parsedFiles[0];

              return (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* File Explorer tab list */}
                  <div className="p-2 bg-gray-950/40 border-b border-gray-850 flex flex-col gap-1 max-h-[140px] overflow-y-auto">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Generated Modules ({parsedFiles.length})</span>
                    {parsedFiles.length === 0 ? (
                      <div className="p-3 text-center text-gray-600 italic">
                        No files compiled yet. Request a code generation to instantiate modules.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {parsedFiles.map((file, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedDevFile(file.name)}
                            className={`w-full p-2 rounded text-left flex items-center justify-between border transition-all cursor-pointer ${
                              activeFile?.name === file.name
                                ? "bg-emerald-950/20 text-[#39FF14] border-[#39FF14]/30 font-bold"
                                : "bg-transparent text-gray-400 border-transparent hover:bg-gray-900/40 hover:text-gray-300"
                            }`}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="truncate">{file.name}</span>
                            </span>
                            <span className="text-[9px] px-1 py-0.2 bg-gray-900 text-gray-500 rounded font-mono">
                              {file.language}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Active Code Panel */}
                  <div className="flex-1 flex flex-col overflow-hidden bg-black/90">
                    {activeFile ? (
                      <div className="flex-1 flex flex-col overflow-hidden">
                        {/* File header control */}
                        <div className="p-2 bg-gray-950/60 border-b border-gray-850 flex justify-between items-center text-gray-400">
                          <span className="truncate font-bold text-gray-300">{activeFile.name}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(activeFile.content, `dev-copy-${activeFile.name}`)}
                            className="text-[9px] text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded hover:bg-emerald-500/10 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            {copiedId === `dev-copy-${activeFile.name}` ? <Check className="w-2.5 h-2.5 text-[#39FF14]" /> : <Copy className="w-2.5 h-2.5" />}
                            <span>{copiedId === `dev-copy-${activeFile.name}` ? "COPIED" : "COPY"}</span>
                          </button>
                        </div>
                        {/* Monospace content container */}
                        <div className="p-3 overflow-auto text-[10px] leading-relaxed text-[#39FF14]/90 select-text whitespace-pre font-mono bg-black/95 flex-1">
                          {activeFile.content}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-600 italic">
                        <Terminal className="w-8 h-8 text-gray-800 mb-2 animate-pulse" />
                        <span>Sandbox compiler idle. Prompt the system for script, function or system layout code.</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  );
}
