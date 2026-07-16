import React, { useState } from "react";
import {
  X,
  User,
  CreditCard,
  Sliders,
  Database,
  Check,
  Save,
  Download,
  Trash2,
  Lock,
  Clock,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Sun,
  Moon,
  Laptop,
  Smartphone,
  QrCode,
  Coins,
  CheckCircle2,
  Calendar,
  Hash
} from "lucide-react";
import { PricingTier, TIER_LIMITS, APPROVED_MODELS } from "../types.js";

interface SettingsModalProps {
  onClose: () => void;
  currentTier: PricingTier;
  onTierChange: (tier: PricingTier) => void;
  usage: any;
  sessions: any[];
  onClearSessions: () => void;
  userProfile: any;
  onUpdateProfile: (updates: any) => Promise<void>;
  theme: "dark" | "light" | "system";
  setTheme: (theme: "dark" | "light" | "system") => void;
  simplifyInterface: boolean;
  setSimplifyInterface: (simplify: boolean) => void;
  apiBaseUrl?: string;
  setApiBaseUrl?: (url: string) => void;
}

const AVATAR_PRESETS = [
  "https://api.dicebear.com/7.x/bottts/svg?seed=Ares",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Zenith",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Cyber",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Pixel",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Vektor",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Matrix"
];

const PLANS_DATA = [
  { id: "free", name: "Free", price: "$0/mo", desc: "Basic exploration & light QA", limitA: "8K cr", modes: "Normal only" },
  { id: "pro", name: "Pro", price: "$9.99/mo", desc: "Power users & general tasks", limitA: "100K cr", modes: "5 Modes" },
  { id: "max", name: "Max", price: "$19.99/mo", desc: "All modes & higher limits", limitA: "250K cr", modes: "All 6 Modes" },
  { id: "ultra", name: "Ultra", price: "$39.99/mo", desc: "Deep multi-model reasoning", limitA: "500K cr", modes: "All 6 Modes" },
  { id: "ultrapromax", name: "Ultra Pro Max", price: "$79.99/mo", desc: "Ultimate developer limit caps", limitA: "1M cr", modes: "All 6 Modes" }
];

const TIER_ORDER: PricingTier[] = ["free", "pro", "max", "ultra", "ultrapromax"];

const formatCardNumber = (value: string) => {
  const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
  const matches = v.match(/\d{4,16}/g);
  const match = (matches && matches[0]) || "";
  const parts = [];

  for (let i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4));
  }

  if (parts.length > 0) {
    return parts.join(" ");
  } else {
    return v;
  }
};

export default function SettingsModal({
  onClose,
  currentTier,
  onTierChange,
  usage,
  sessions,
  onClearSessions,
  userProfile,
  onUpdateProfile,
  theme,
  setTheme,
  simplifyInterface,
  setSimplifyInterface,
  apiBaseUrl,
  setApiBaseUrl
}: SettingsModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<"profile" | "subscription" | "ai" | "system">("profile");

  // Upgrade Modal states
  const [selectedPlanToUpgrade, setSelectedPlanToUpgrade] = useState<any>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  // Interactive Payment states
  const [upgradeSubStep, setUpgradeSubStep] = useState<"features" | "payment" | "terminal" | "success" | "failed">("features");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "gpay" | "qr">("card");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [upiId, setUpiId] = useState("");
  const [paymentLogs, setPaymentLogs] = useState<string[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  // Profile Form States
  const [displayName, setDisplayName] = useState(userProfile?.displayName || "");
  const [selectedAvatar, setSelectedAvatar] = useState(userProfile?.photoURL || AVATAR_PRESETS[1]);
  const [aboutMe, setAboutMe] = useState(userProfile?.customInstructionsAboutMe || "");
  const [responseStyle, setResponseStyle] = useState(userProfile?.customInstructionsResponseStyle || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // AI Preferences States
  const [temperature, setTemperature] = useState(userProfile?.defaultTemperature ?? 0.7);
  const [defaultModel, setDefaultModel] = useState(userProfile?.defaultModel || "claude-sonnet-4-6");
  const [maxTokens, setMaxTokens] = useState(userProfile?.defaultMaxTokens || 4096);
  const [isSavingAI, setIsSavingAI] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);

  // Clear confirmation state
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleApplyPromoCode = async () => {
    if (!promoCode || promoCode.trim() === "") return;
    setPromoError(null);
    setPromoSuccess(null);
    setIsApplyingPromo(true);

    setTimeout(() => {
      setIsApplyingPromo(false);
      const codeClean = promoCode.trim().toUpperCase();
      if (codeClean === "ZEN26ZX") {
        setIsPromoApplied(true);
        setPromoSuccess("Promo Code Applied! First month is 100% off.");
      } else {
        setPromoError("Invalid promo code.");
      }
    }, 800);
  };

  const handleConfirmPayment = async (shouldFail: boolean = false) => {
    setUpgradeSubStep("terminal");
    setPaymentLogs([]);
    
    const logs = shouldFail ? [
      "[SECURE PORT INITIATED ON PORT 3000]",
      "[ESTABLISHING ENCRYPTED GATEWAY TO MERCHANT ENG...]",
      "[CONTACTING BANKING NETWORKS WITH SECURED PASSKEY...]",
      "[VERIFYING AUTHENTICITY SIGNS... FAILURE]",
      "[BANK SERVER ERROR CODE: ERR_DECLINED_INSUFFICIENT_FUNDS]",
      "[TRANSACTION TERMINATED SAFELY TO PROTECT IDENTITY]"
    ] : [
      "[SECURE PORT INITIATED ON PORT 3000]",
      "[ESTABLISHING ENCRYPTED GATEWAY TO MERCHANT ENG...]",
      "[CONTACTING BANKING NETWORKS WITH SECURED PASSKEY...]",
      "[VERIFYING AUTHENTICITY SIGNS... SUCCESS]",
      "[MUTUAL FUNDS AUTHORIZATION DECLARED VERIFIED]",
      "[ISSUING ZENITH DIGITAL WORKSPACE LICENSE...]",
      "[SYNCHRONIZING PROFILE CREDITS TO FIRESTORE...]"
    ];

    let logIdx = 0;
    const interval = setInterval(() => {
      if (logIdx < logs.length) {
        setPaymentLogs((prev) => [...prev, logs[logIdx]]);
        logIdx++;
      } else {
        clearInterval(interval);
        if (shouldFail) {
          setUpgradeSubStep("failed");
        } else {
          setUpgradeSubStep("success");
          
          // Commit the upgrade
          onTierChange(selectedPlanToUpgrade.id as PricingTier);
          
          if (["pro", "max", "ultra", "ultrapromax"].includes(selectedPlanToUpgrade.id)) {
            try {
              const baseUrl = apiBaseUrl || "http://localhost:3000";
              fetch(`${baseUrl}/api/send-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  to: userProfile?.email || "user@zenith.ai",
                  subject: `Thanks for subscribing to ${selectedPlanToUpgrade.name} plan!`,
                  html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                      <h1 style="color: #FF2DAA;">Subscription Confirmed</h1>
                      <p>Hello ${userProfile?.displayName || 'User'},</p>
                      <p>Thank you for subscribing to the <strong>${selectedPlanToUpgrade.name}</strong> plan.</p>
                      <p>You have unlocked new features and extended credit limits!</p>
                      <br/>
                      <p>Enjoy your premium experience.</p>
                      <p>Best,<br/>The Zenith Team</p>
                    </div>
                  `
                })
              });
            } catch (e) {
              console.error("Failed to trigger subscription email");
            }
          }

          setTimeout(() => {
            setSelectedPlanToUpgrade(null);
            setUpgradeSubStep("features");
          }, 3000);
        }
      }
    }, 400);
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setSaveSuccess(false);
    try {
      await onUpdateProfile({
        displayName,
        photoURL: selectedAvatar,
        customInstructionsAboutMe: aboutMe,
        customInstructionsResponseStyle: responseStyle
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveAIPreferences = async () => {
    setIsSavingAI(true);
    setAiSuccess(false);
    try {
      await onUpdateProfile({
        defaultTemperature: temperature,
        defaultModel,
        defaultMaxTokens: maxTokens
      });
      setAiSuccess(true);
      setTimeout(() => setAiSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingAI(false);
    }
  };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessions, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `zenith_chats_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getTemperatureLabel = (val: number) => {
    if (val <= 0.3) return "Precise / Factual";
    if (val <= 0.7) return "Balanced / Creative";
    return "Highly Imaginative";
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="w-full max-w-4xl h-full max-h-[85vh] bg-[#0E1121] border border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative text-white">
        
        {/* Glow Line Header */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent" />

        {/* Modal Header */}
        <div className="p-4 border-b border-gray-850 flex items-center justify-between bg-[#11142A]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#00E5FF]" />
            <h2 className="text-sm font-semibold font-display tracking-wide uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] to-purple-400">
              Zenith Controller
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-800/60 rounded-full transition-colors cursor-pointer text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="grid grid-cols-4 border-b border-gray-850 bg-gray-950/40 text-gray-400">
          {[
            { id: "profile", label: "Profile", icon: User },
            { id: "subscription", label: "Billing", icon: CreditCard },
            { id: "ai", label: "AI Config", icon: Sparkles },
            { id: "system", label: "System", icon: Database }
          ].map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`py-2.5 flex flex-col items-center justify-center gap-1 transition-all border-b-2 cursor-pointer ${
                  isActive
                    ? "border-[#00E5FF] text-white bg-[#00E5FF]/5 font-bold"
                    : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900/20"
                }`}
              >
                <TabIcon className={`w-3.5 h-3.5 ${isActive ? "text-[#00E5FF]" : ""}`} />
                <span className="text-[9px] font-mono tracking-wider">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-[#0B0D19]/50">
          
          {/* TAB 1: User Profile */}
          {activeSubTab === "profile" && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Identity Avatar</span>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border border-gray-700 bg-gray-950 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img src={selectedAvatar} alt="Profile Avatar" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {AVATAR_PRESETS.map((av, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedAvatar(av)}
                        className={`w-7 h-7 rounded-full border bg-gray-900 flex items-center justify-center overflow-hidden transition-all cursor-pointer ${
                          selectedAvatar === av ? "border-[#00E5FF] scale-110 shadow-lg" : "border-gray-800 hover:border-gray-600"
                        }`}
                      >
                        <img src={av} alt={`preset ${idx}`} className="w-5.5 h-5.5 object-contain" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Display Name Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Zenith Space Explorer"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00E5FF] font-sans"
                />
              </div>

              {/* Verified Email Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Authenticated Account</label>
                <div className="flex items-center justify-between bg-gray-950 border border-gray-850 rounded-xl px-3 py-2 text-xs font-mono text-gray-400">
                  <span className="truncate max-w-[200px]">{userProfile?.email || "anonymous@zenith.ai"}</span>
                  <span className="text-[8px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" /> Verified
                  </span>
                </div>
              </div>

              {/* Custom Instructions Textareas */}
              <div className="space-y-2 border-t border-gray-850 pt-3">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#FF2DAA]" />
                  <span className="text-[10px] font-mono text-[#FF2DAA] uppercase tracking-wider font-bold">Custom Instructions</span>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[9px] text-gray-400 block font-mono">User Background Context</label>
                  <textarea
                    rows={2}
                    value={aboutMe}
                    onChange={(e) => setAboutMe(e.target.value)}
                    placeholder="E.g., I'm a React web developer building full-stack cloud applications."
                    className="w-full bg-gray-950 border border-gray-850 rounded-xl p-2 text-[11px] text-gray-300 focus:outline-none focus:border-[#FF2DAA] resize-none font-sans leading-relaxed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-gray-400 block font-mono">How the AI should respond</label>
                  <textarea
                    rows={2}
                    value={responseStyle}
                    onChange={(e) => setResponseStyle(e.target.value)}
                    placeholder="E.g., Be concise, write production-ready TypeScript, and always comment code blocks cleanly."
                    className="w-full bg-gray-950 border border-gray-850 rounded-xl p-2 text-[11px] text-gray-300 focus:outline-none focus:border-[#FF2DAA] resize-none font-sans leading-relaxed"
                  />
                </div>
              </div>

              {/* Save profile button */}
              <button
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-purple-500 hover:from-[#00E5FF]/95 hover:to-purple-500/95 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-950/20 cursor-pointer disabled:opacity-50"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Identity Synchronized
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" /> {isSavingProfile ? "Synchronizing..." : "Save Profile Details"}
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 2: Subscription & Billing */}
          {activeSubTab === "subscription" && (
            <div className="space-y-4 animate-fade-in">
              
              {/* Current Active Plan Card */}
              <div className="relative p-4 rounded-2xl bg-gradient-to-br from-[#121634] to-[#0A0D1D] border border-gray-800/80 overflow-hidden">
                <div className="absolute top-0 right-0 p-2 bg-[#FF2DAA]/20 text-[#FF2DAA] text-[8px] font-mono uppercase tracking-widest rounded-bl-xl font-bold border-l border-b border-gray-800">
                  ACTIVE SUITE
                </div>
                <span className="text-[9px] font-mono text-gray-400 block uppercase">Subscription State</span>
                <span className="text-xl font-display font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] to-[#FF2DAA] block">
                  { PLANS_DATA.find(p => p.id === currentTier)?.name || currentTier.toUpperCase() }
                </span>
                <span className="text-xs text-gray-400 mt-1 block">
                  { PLANS_DATA.find(p => p.id === currentTier)?.desc }
                </span>
                
                <div className="mt-4 pt-3 border-t border-gray-800/80 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[9px] font-mono text-gray-500 uppercase block">Next Due Date</span>
                    <span className="font-semibold text-gray-300">August 12, 2026</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-mono text-gray-500 uppercase block">Amount</span>
                    <span className="font-semibold text-gray-300">{PLANS_DATA.find(p => p.id === currentTier)?.price}</span>
                  </div>
                </div>
              </div>

              {/* Plan Choice Grid Selector */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Manage Pricing Tiers</span>
                <div className="space-y-2">
                  {PLANS_DATA.filter((plan) => {
                    const planIdx = TIER_ORDER.indexOf(plan.id as PricingTier);
                    const currentIdx = TIER_ORDER.indexOf(currentTier);
                    return planIdx >= currentIdx;
                  }).map((plan) => {
                    const isSelected = plan.id === currentTier;
                    return (
                      <button
                        key={plan.id}
                        onClick={() => {
                          const planIdx = TIER_ORDER.indexOf(plan.id as PricingTier);
                          const currentIdx = TIER_ORDER.indexOf(currentTier);
                          if (planIdx > currentIdx) {
                            setSelectedPlanToUpgrade(plan);
                            setUpgradeSubStep("features");
                            setPaymentMethod("card");
                            setCardName("");
                            setCardNumber("");
                            setCardExpiry("");
                            setCardCvc("");
                            setUpiId("");
                            setPaymentLogs([]);
                            setPromoCode("");
                            setIsPromoApplied(false);
                            setPromoError(null);
                            setPromoSuccess(null);
                          }
                        }}
                        className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#00E5FF]/10 border-[#00E5FF] text-white"
                            : "bg-gray-950/40 border-gray-850 text-gray-400 hover:border-gray-800"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-bold ${isSelected ? "text-[#00E5FF]" : "text-white"}`}>
                              {plan.name}
                            </span>
                            <span className="text-[9px] text-gray-400 font-mono">({plan.price})</span>
                          </div>
                          <span className="text-[8.5px] text-gray-500 block truncate mt-0.5">{plan.desc}</span>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2">
                          <span className="text-[8px] font-mono bg-gray-900 border border-gray-800 px-1.5 py-0.5 rounded text-gray-300">
                            {plan.limitA}
                          </span>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-[#00E5FF]/20 flex items-center justify-center border border-[#00E5FF]/40">
                              <Check className="w-2.5 h-2.5 text-[#00E5FF]" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic rolling usage levels */}
              <div className="space-y-2 pt-2 border-t border-gray-850">
                <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block">Active Allocations (Used / Total)</span>
                
                <div className="space-y-2 text-[10px] font-mono">
                  {/* Pool A */}
                  <div>
                    <div className="flex justify-between text-gray-400 mb-0.5">
                      <span>Standard LLM Pool</span>
                      <span className="text-gray-200">
                        {usage.poolA.used.toLocaleString()} / {usage.poolA.limit.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (usage.poolA.used / Math.max(1, usage.poolA.limit)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Pool B */}
                  {currentTier !== "free" && (
                    <div>
                      <div className="flex justify-between text-gray-400 mb-0.5">
                        <span>Co-Model Pool</span>
                        <span className="text-gray-200">
                          {usage.poolB.used.toLocaleString()} / {usage.poolB.limit.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-950 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (usage.poolB.used / Math.max(1, usage.poolB.limit)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Pool C */}
                  {currentTier !== "free" && (
                    <div>
                      <div className="flex justify-between text-gray-400 mb-0.5">
                        <span>Super Council Pool</span>
                        <span className="text-gray-200">
                          {usage.poolC.used.toLocaleString()} / {usage.poolC.limit.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-950 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-pink-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (usage.poolC.used / Math.max(1, usage.poolC.limit)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: AI Preferences */}
          {activeSubTab === "ai" && (
            <div className="space-y-4 animate-fade-in">
              
              {/* Default Model Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Default New Session Model</label>
                <select
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#00E5FF] font-mono"
                >
                  {APPROVED_MODELS.map((model) => (
                    <option key={model.id} value={model.id} className="bg-[#0E1121] text-white">
                      {model.name} ({model.tier})
                    </option>
                  ))}
                </select>
                <p className="text-[8.5px] text-gray-500 font-mono">
                  All newly established threads will automatically load this model preset.
                </p>
              </div>

              {/* Temperature Slider */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-gray-400 uppercase tracking-wider">Model Temperature / Creativity</span>
                  <span className="text-cyan-400 font-bold">{temperature.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-1 bg-gray-950 rounded-lg appearance-none cursor-pointer accent-[#00E5FF]"
                />
                <div className="flex justify-between text-[8px] font-mono text-gray-500">
                  <span>Precise / Coders</span>
                  <span>Balanced</span>
                  <span>Creative / Ambient</span>
                </div>
                <div className="text-[9px] font-mono bg-gray-950 px-2.5 py-1.5 rounded-lg border border-gray-850 text-gray-400 text-center">
                  Behavior preset: <strong className="text-gray-200">{getTemperatureLabel(temperature)}</strong>
                </div>
              </div>

              {/* Max Output Token limits */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Default Max Output Limit</label>
                <select
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#00E5FF] font-mono"
                >
                  <option value={1024}>1,024 Tokens (Fast/Concise)</option>
                  <option value={2048}>2,048 Tokens (Standard)</option>
                  <option value={4096}>4,096 Tokens (Thorough)</option>
                  <option value={8192}>8,192 Tokens (Maxi Analysis)</option>
                  <option value={16384}>16,384 Tokens (Infinite Code)</option>
                </select>
                <p className="text-[8.5px] text-gray-500 font-mono">
                  Limits standard token consumption limits for safety guards.
                </p>
              </div>

              {/* Save AI Preferences button */}
              <button
                onClick={handleSaveAIPreferences}
                disabled={isSavingAI}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-[#FF2DAA] hover:from-purple-500/95 hover:to-[#FF2DAA]/95 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-pink-950/20 cursor-pointer disabled:opacity-50"
              >
                {aiSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> AI Preferences Synchronized
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" /> {isSavingAI ? "Saving..." : "Save AI Configuration"}
                  </>
                )}
              </button>

            </div>
          )}

          {/* TAB 4: System and Data */}
          {activeSubTab === "system" && (
            <div className="space-y-4 animate-fade-in">
              
              {/* App Theme and Layout Complexity (Moved from legacy Settings overlay) */}
              <div className="space-y-3.5">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Visual Preferences</span>
                
                {/* Theme Selector Grid */}
                <div className="space-y-1">
                  <span className="text-[8.5px] font-mono text-gray-500 block uppercase">Background Accent</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "light", label: "Light Mode", icon: Sun },
                      { id: "dark", label: "Dark Mode", icon: Moon },
                      { id: "system", label: "System", icon: Laptop },
                    ].map((item) => {
                      const ThemeIcon = item.icon;
                      const isSelected = theme === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setTheme(item.id as any)}
                          className={`py-2 px-1 flex flex-col items-center justify-center gap-1 rounded-xl border text-[9px] font-mono transition-all cursor-pointer ${
                            isSelected
                              ? "border-[#00E5FF] bg-[#00E5FF]/10 text-white font-bold"
                              : "border-gray-850 bg-gray-950/40 text-gray-400 hover:border-gray-700"
                          }`}
                        >
                          <ThemeIcon className="w-3.5 h-3.5" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cyber interface details toggle */}
                <div className="space-y-1 pt-1">
                  <span className="text-[8.5px] font-mono text-gray-500 block uppercase">Interface Complexity</span>
                  <button
                    onClick={() => setSimplifyInterface(!simplifyInterface)}
                    className={`w-full p-2 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                      simplifyInterface
                        ? "border-pink-500/50 bg-pink-500/5 text-white"
                        : "border-gray-850 bg-gray-950/40 text-gray-400"
                    }`}
                  >
                    <div className="space-y-0.5 max-w-[190px]">
                      <span className="text-[10px] font-bold block">
                        {simplifyInterface ? "Minimalist Modern Style" : "Cyber Robotic Style"}
                      </span>
                      <span className="text-[8px] text-gray-500 leading-tight block">
                        {simplifyInterface 
                          ? "Hides dense scans, laser loader loops, & grid matrices." 
                          : "Enables interactive neon radar & futuristic scans."}
                      </span>
                    </div>
                    <div className={`w-8 h-4 rounded-full p-0.5 transition-colors flex-shrink-0 ${simplifyInterface ? "bg-pink-500" : "bg-gray-800"}`}>
                      <div className={`w-3 h-3 rounded-full bg-white transition-transform ${simplifyInterface ? "translate-x-4" : "translate-x-0"}`} />
                    </div>
                  </button>
                </div>
              </div>



              {/* Backups & Data Management */}
              <div className="space-y-3 pt-3 border-t border-gray-850">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Data Administration</span>
                
                {/* Backup export button */}
                <div className="space-y-1">
                  <span className="text-[8.5px] text-gray-500 block font-mono">EXPORT ARCHIVE</span>
                  <button
                    onClick={handleExportData}
                    className="w-full py-2 bg-gray-950 border border-gray-800 hover:border-[#00E5FF]/40 rounded-xl text-xs text-gray-300 font-mono transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#00E5FF]" /> Export Chat Threads (.json)
                  </button>
                </div>

                {/* Destructive Clear All Chats button */}
                <div className="space-y-1 pt-1">
                  <span className="text-[8.5px] text-red-500 block font-mono">DANGER ZONE</span>
                  {confirmDelete ? (
                    <div className="p-2 rounded-xl border border-red-500/30 bg-red-950/10 space-y-2">
                      <span className="text-[9px] text-red-400 block font-semibold text-center leading-normal">
                        Are you absolutely sure? This will delete all {sessions.length} threads and can't be undone.
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            onClearSessions();
                            setConfirmDelete(false);
                          }}
                          className="py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded border border-red-500 cursor-pointer text-center"
                        >
                          Yes, Wipe Workspace
                        </button>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="py-1.5 bg-gray-900 hover:bg-gray-800 text-gray-300 text-[10px] rounded border border-gray-800 cursor-pointer text-center"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="w-full py-2 bg-red-950/10 hover:bg-red-950/20 border border-red-950 hover:border-red-500/40 rounded-xl text-xs text-red-400 font-mono transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" /> WIPE ALL THREADS
                    </button>
                  )}
                </div>
              </div>

              {/* Workspace technical details footer */}
              <div className="pt-3 border-t border-gray-850 flex items-center justify-between text-[8px] text-gray-500 font-mono">
                <span>V1.5.0 Suite</span>
                <span>Port 3000 Ingress</span>
              </div>

            </div>
          )}

        </div>

        {/* Absolute Upgrade Confirmation Overlay */}
        {selectedPlanToUpgrade && (
          <div className="absolute inset-0 bg-[#0E1121] z-50 flex flex-col animate-fade-in text-white p-4 justify-between select-none">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-850 pb-3">
              <h3 className="font-display font-black text-xs text-[#00E5FF] uppercase tracking-widest">
                {upgradeSubStep === "payment" ? "Zenith Payment Terminal" : "Buy Subscription Plan"}
              </h3>
              <button
                onClick={() => {
                  if (upgradeSubStep !== "terminal") {
                    setSelectedPlanToUpgrade(null);
                  }
                }}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                disabled={upgradeSubStep === "terminal"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Content */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 flex flex-col justify-center">
              
              {upgradeSubStep === "terminal" && (
                <div className="p-4 bg-black border border-gray-850 rounded-xl font-mono text-[9px] text-gray-400 space-y-2 text-left h-[260px] overflow-y-auto flex flex-col justify-end">
                  <div className="space-y-1.5 flex-1 overflow-y-auto scrollbar-none">
                    {paymentLogs.map((log, i) => (
                      <div key={i} className="animate-fade-in flex items-start gap-1">
                        <span className="text-purple-400">&gt;</span>
                        <span className={log.includes("SUCCESS") || log.includes("VERIFIED") ? "text-[#39FF14]" : log.includes("FAILURE") || log.includes("ERROR") ? "text-red-400" : ""}>{log}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500 pt-2 border-t border-gray-900">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                    <span>SECURE TRANSACTION HANDSHAKE ACTIVE...</span>
                  </div>
                </div>
              )}

              {upgradeSubStep === "success" && (
                <div className="flex flex-col items-center justify-center text-center py-6 px-4 space-y-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl h-[260px] relative overflow-hidden animate-fade-in">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-[#39FF14] flex items-center justify-center text-[#39FF14] shadow-[0_0_20px_rgba(57,255,20,0.3)]">
                      <Check className="w-8 h-8 stroke-[3]" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-display font-black text-[#39FF14] uppercase tracking-wider">
                      PAYMENT CONFIRMED
                    </h3>
                    <p className="text-xs text-gray-200">
                      License for <span className="font-bold capitalize text-white">{selectedPlanToUpgrade.name} Plan</span> active!
                    </p>
                    <p className="text-[10px] text-gray-400 max-w-[240px] mx-auto pt-1 leading-snug">
                      Your permanent credits have been provisioned. Enjoy your upgraded Zenith Workspace!
                    </p>
                  </div>
                </div>
              )}

              {upgradeSubStep === "failed" && (
                <div className="flex flex-col items-center justify-center text-center py-6 px-4 space-y-4 bg-red-950/20 border border-red-500/30 rounded-2xl h-[260px] relative animate-fade-in">
                  <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                    <X className="w-8 h-8 stroke-[3]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-display font-black text-red-400 uppercase tracking-wider">
                      TRANSACTION DECLINED
                    </h3>
                    <p className="text-xs text-gray-300">
                      Bank Server Response: <span className="font-mono text-red-400 font-bold bg-black/40 px-1 rounded">ERR_504</span>
                    </p>
                    <p className="text-[10px] text-gray-400 max-w-[240px] mx-auto leading-snug">
                      Please check card funds, verify UPI request status, or try another simulated checkout option.
                    </p>
                  </div>
                </div>
              )}

              {upgradeSubStep === "features" && (
                <div className="space-y-4 animate-fade-in">
                  {/* Visual Premium Badge Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#121634] to-[#0A0D1D] border border-pink-500/25 text-center relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-pink-500/10 rounded-full blur-xl" />
                    <span className="text-[8px] font-mono bg-[#FF2DAA]/10 text-[#FF2DAA] border border-[#FF2DAA]/25 px-2 py-0.5 rounded-full uppercase tracking-wider inline-block mb-1 font-bold">
                      PREMIUM UPGRADE
                    </span>
                    <h3 className="text-lg font-display font-black text-white capitalize">
                      {selectedPlanToUpgrade.name} Suite
                    </h3>
                    <div className="text-2xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] to-[#FF2DAA] mt-1">
                      {selectedPlanToUpgrade.price}
                    </div>
                    <p className="text-xs text-gray-400 mt-1 max-w-[240px] mx-auto leading-normal font-sans">
                      {selectedPlanToUpgrade.desc}
                    </p>
                  </div>

                  {/* Features Checklist */}
                  <div className="space-y-2.5 bg-gray-950/40 p-3.5 rounded-xl border border-gray-850">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">Included Features</span>
                    
                    <div className="space-y-2 text-[10.5px]">
                      <div className="flex items-start gap-2 text-gray-200">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>Standard LLM limit: <strong className="text-white">{selectedPlanToUpgrade.limitA}</strong> credits</span>
                      </div>
                      <div className="flex items-start gap-2 text-gray-200">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>Modes available: <strong className="text-white">{selectedPlanToUpgrade.modes}</strong></span>
                      </div>
                      <div className="flex items-start gap-2 text-gray-200">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>Unlock multi-model reasoning and rolling pools</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {upgradeSubStep === "payment" && (
                <div className="space-y-4 animate-fade-in text-left">
                  {/* Plan Summary Row */}
                  <div className="p-3.5 bg-gray-950/70 border border-purple-500/15 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[8px] font-mono text-gray-500 uppercase block">Purchase Version</span>
                        <span className="font-bold text-white capitalize">
                          {isPromoApplied ? `${selectedPlanToUpgrade.name} Plan (Promo Applied)` : `${selectedPlanToUpgrade.name} Version License`}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        {isPromoApplied ? (
                          <>
                            <span className="text-[9.5px] font-mono text-gray-500 line-through">{selectedPlanToUpgrade.price}</span>
                            <span className="font-mono font-bold text-[#39FF14] text-sm">$0.00</span>
                          </>
                        ) : (
                          <span className="font-mono font-bold text-[#00E5FF] text-sm">{selectedPlanToUpgrade.price}</span>
                        )}
                      </div>
                    </div>
                    {isPromoApplied && (
                      <div className="text-[9.5px] font-mono text-[#39FF14] bg-[#39FF14]/10 p-1.5 rounded border border-[#39FF14]/20 flex justify-between items-center">
                        <span>100% OFF FIRST MONTH</span>
                        <span className="font-bold">ZEN26ZX</span>
                      </div>
                    )}
                  </div>

                  {/* Promo Code Input block */}
                  {!isPromoApplied ? (
                    <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-850 space-y-2">
                      <span className="text-[9px] font-mono text-gray-500 uppercase block tracking-wider">Do you have a promo code?</span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter code (e.g. ZEN26ZX)"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#00E5FF]"
                        />
                        <button
                          onClick={handleApplyPromoCode}
                          disabled={isApplyingPromo || !promoCode}
                          className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-30 disabled:pointer-events-none text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
                        >
                          {isApplyingPromo ? "Applying..." : "Apply"}
                        </button>
                      </div>
                      {promoError && (
                        <span className="text-[9.5px] font-mono text-red-400 block leading-tight">{promoError}</span>
                      )}
                    </div>
                  ) : (
                    promoSuccess && (
                      <div className="p-2.5 bg-emerald-950/25 border border-emerald-500/20 rounded-xl">
                        <span className="text-[10.5px] text-[#39FF14] font-mono leading-tight block">{promoSuccess}</span>
                      </div>
                    )
                  )}

                  {/* Payment Methods */}
                  <div className="grid grid-cols-3 gap-1 bg-[#090B15] p-1 border border-gray-850 rounded-xl">
                    {[
                      { id: "card", label: "Card", icon: CreditCard },
                      { id: "gpay", label: "UPI", icon: Smartphone },
                      { id: "qr", label: "QR", icon: QrCode }
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isSel = paymentMethod === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setPaymentMethod(tab.id as any)}
                          className={`py-1.5 rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                            isSel 
                              ? "bg-[#11152D] border border-[#00E5FF]/25 text-[#00E5FF]" 
                              : "text-gray-500 hover:text-gray-300 hover:bg-gray-900/40"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span className="text-[8px] font-mono font-bold">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Method Content */}
                  <div className="space-y-3 min-h-[170px] bg-gray-950/20 p-3 rounded-xl border border-gray-900 flex flex-col justify-center">
                    {paymentMethod === "card" && (
                      <div className="space-y-2 text-left">
                        <div>
                          <label className="block text-[8px] font-mono text-gray-500 uppercase mb-1">Cardholder Name</label>
                          <div className="relative">
                            <User className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-600" />
                            <input 
                              type="text"
                              placeholder="e.g. Satoshi Nakamoto"
                              value={cardName}
                              onChange={(e) => setCardName(e.target.value)}
                              className="w-full bg-gray-950 border border-gray-850 rounded-lg p-1.5 pl-8 text-[11px] font-mono text-gray-200 focus:outline-none focus:border-[#FF2DAA]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[8px] font-mono text-gray-500 uppercase mb-1">Credit Card Number</label>
                          <div className="relative">
                            <CreditCard className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-600" />
                            <input 
                              type="text"
                              placeholder="4000 1234 5678 9010"
                              maxLength={19}
                              value={cardNumber}
                              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                              className="w-full bg-gray-950 border border-gray-850 rounded-lg p-1.5 pl-8 text-[11px] font-mono text-gray-200 focus:outline-none focus:border-[#FF2DAA]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[8px] font-mono text-gray-500 uppercase mb-1">Expiry MM/YY</label>
                            <div className="relative">
                              <Calendar className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-600" />
                              <input 
                               type="text"
                               placeholder="12/28"
                               maxLength={5}
                               value={cardExpiry}
                               onChange={(e) => setCardExpiry(e.target.value)}
                               className="w-full bg-gray-950 border border-gray-850 rounded-lg p-1.5 pl-8 text-[11px] font-mono text-gray-200 focus:outline-none focus:border-[#FF2DAA]"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[8px] font-mono text-gray-500 uppercase mb-1">CVC Code</label>
                            <div className="relative">
                              <Hash className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-600" />
                              <input 
                                type="password"
                                placeholder="•••"
                                maxLength={3}
                                value={cardCvc}
                                onChange={(e) => setCardCvc(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-850 rounded-lg p-1.5 pl-8 text-[11px] font-mono text-gray-200 focus:outline-none focus:border-[#FF2DAA]"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {paymentMethod === "gpay" && (
                      <div className="space-y-3 text-center py-1">
                        <button
                          type="button"
                          onClick={() => {
                            window.open("https://pay.google.com/gp/w/home/paymentmethods", "_blank");
                          }}
                          className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:to-pink-500 text-white font-sans font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] border border-blue-400/20"
                        >
                          <Smartphone className="w-4 h-4 animate-pulse" />
                          Pay with Google Payment Methods
                        </button>
                        
                        <div className="p-2.5 bg-gray-950 border border-gray-850 rounded-lg text-[8.5px] text-gray-400 font-mono flex items-center justify-center gap-1.5">
                          <Lock className="w-3 h-3 text-[#00E5FF] flex-shrink-0" />
                          <span>Direct secure link to Google Pay Account. Verify/manage options, then click CONFIRM PAYMENT.</span>
                        </div>
                      </div>
                    )}

                    {paymentMethod === "qr" && (() => {
                      const priceValue = parseFloat(selectedPlanToUpgrade.price.replace(/[^0-9.]/g, '')) || 9.99;
                      const upiUri = `upi://pay?pa=zenithai@upi&pn=Zenith%20AI&am=${priceValue}&cu=USD&tn=Zenith%20${selectedPlanToUpgrade.name}%20Upgrade`;
                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUri)}`;
                      return (
                        <div className="flex flex-col items-center justify-center p-1 text-center space-y-2">
                          <div className="relative p-1 bg-white rounded-lg inline-block shadow-md">
                            <img
                              src={qrUrl}
                              alt="Scan to pay"
                              referrerPolicy="no-referrer"
                              className="w-20 h-20"
                            />
                          </div>
                          <span className="text-[10px] font-mono text-gray-300 block">
                            Scan to pay {selectedPlanToUpgrade.price}
                          </span>
                        </div>
                      );
                    })()}

                  </div>
                </div>
              )}

            </div>

            {/* Footer Controls */}
            {upgradeSubStep === "features" && (
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-850">
                <button
                  onClick={() => setSelectedPlanToUpgrade(null)}
                  className="py-2 px-3 border border-gray-800 hover:bg-gray-900 text-gray-400 hover:text-white rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer text-center"
                >
                  I am good
                </button>
                <button
                  onClick={() => setUpgradeSubStep("payment")}
                  className="py-2 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer hover:shadow-lg hover:shadow-emerald-500/10 hover:opacity-95 text-center"
                >
                  Upgrade to {selectedPlanToUpgrade.name}
                </button>
              </div>
            )}

            {upgradeSubStep === "payment" && (
              <div className="space-y-2 pt-3 border-t border-gray-850">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setUpgradeSubStep("features")}
                    className="py-2 px-3 border border-gray-800 hover:bg-gray-900 text-gray-400 hover:text-white rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer text-center"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => handleConfirmPayment(false)}
                    disabled={
                      paymentMethod === "card" && (!cardName || !cardNumber || !cardExpiry || !cardCvc)
                    }
                    className="py-2 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 disabled:opacity-30 disabled:pointer-events-none text-white rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer hover:shadow-lg text-center flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirm Payment
                  </button>
                </div>
                <button
                  onClick={() => handleConfirmPayment(true)}
                  disabled={
                    paymentMethod === "card" && (!cardName || !cardNumber || !cardExpiry || !cardCvc)
                  }
                  className="w-full py-1 bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 border border-red-500/20 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Simulate Bank Decline
                </button>
              </div>
            )}

            {upgradeSubStep === "failed" && (
              <div className="pt-3 border-t border-gray-850">
                <button
                  onClick={() => setUpgradeSubStep("payment")}
                  className="w-full py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Try Another Route
                </button>
              </div>
            )}

            {upgradeSubStep === "success" && (
              <div className="py-2.5 text-center text-[10px] font-mono text-emerald-400 tracking-wider uppercase animate-pulse">
                🔄 SYNCHRONIZING DIGITAL LICENSE...
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
