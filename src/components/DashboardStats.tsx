import React, { useState, useEffect } from "react";
import { UsagePools, PricingTier, TIER_LIMITS } from "../types.js";
import {
  Zap,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Layers,
  Coins,
  Plus,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Award,
  Check,
  X,
  CreditCard,
  QrCode,
  Smartphone,
  AlertCircle,
  ArrowLeft,
  History,
  Lock,
  Unlock,
  Trash2,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DashboardStatsProps {
  currentTier: PricingTier;
  onTierChange: (tier: PricingTier) => void;
  usage: UsagePools;
  onBuyTokens: (pool: "poolA" | "poolB" | "poolC", amount: number, price: string) => void;
  onResetUsage: () => void;
  countdownSeconds: number;
  sessions?: any[];
  onSelectSession?: (id: string) => void;
  onDeleteSessionDirect?: (id: string) => void;
  onUpdateSession?: (session: any) => void;
}

export default function DashboardStats({
  currentTier,
  onTierChange,
  usage,
  onBuyTokens,
  onResetUsage,
  countdownSeconds,
  sessions = [],
  onSelectSession,
  onDeleteSessionDirect,
  onUpdateSession,
}: DashboardStatsProps) {
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyTarget, setBuyTarget] = useState<"poolA" | "poolB" | "poolC">("poolA");
  
  // Checkout States
  const [selectedPack, setSelectedPack] = useState<any>(null); // pack object or "pay-as-you-go"
  const [currency, setCurrency] = useState<"USD" | "INR" | "EUR">("USD");
  const [customAmount, setCustomAmount] = useState<string>("5"); // Default custom amount for Pay as you GO
  const [paymentMethod, setPaymentMethod] = useState<"card" | "gpay" | "qr">("card");
  
  // Simulated Card Inputs
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  
  // Simulated UPI ID
  const [upiId, setUpiId] = useState("");
  const [qrUtr, setQrUtr] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Payment Execution States
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [paymentLogs, setPaymentLogs] = useState<string[]>([]);

  // Interactive Payment Sub-Steps
  const [paymentSubStep, setPaymentSubStep] = useState<"idle" | "bank-otp" | "gpay-sheet" | "upi-pinpad">("idle");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState("State Bank of India - **** 5421");
  const [upiPin, setUpiPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [qrSecondsLeft, setQrSecondsLeft] = useState(300);
  const [qrExpired, setQrExpired] = useState(false);

  const [historyFilter, setHistoryFilter] = useState<"all" | "normal" | "council" | "comodel" | "dev" | "smode" | "supercouncil">("all");

  const filteredSessions = sessions.filter((s) => {
    if (historyFilter === "all") return true;
    return s.mode === historyFilter;
  });

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const limits = TIER_LIMITS[currentTier];

  const poolAPct = Math.min(100, Math.round((usage.poolA.used / usage.poolA.limit) * 100));
  const poolBPct = Math.min(100, Math.round((usage.poolB.used / usage.poolB.limit) * 100));
  const poolCPct = limits.poolC > 0 ? Math.min(100, Math.round((usage.poolC.used / usage.poolC.limit) * 100)) : 0;

  // Exchange Rates
  const exchangeRates = {
    USD: 1,
    INR: 83,
    EUR: 0.92
  };

  const currencySymbols = {
    USD: "$",
    INR: "₹",
    EUR: "€"
  };

  const standardPacks = [
    { name: "Starter", usdPrice: 5, tokens: 50000, desc: "One-off unlock when hitting limit" },
    { name: "Standard", usdPrice: 10, tokens: 125000, desc: "Regular heavy users" },
    { name: "Pro Pack", usdPrice: 20, tokens: 300000, desc: "Power users, best per-credit value" },
    { name: "Enterprise", usdPrice: 50, tokens: 1000000, desc: "Teams, heavy Super Council usage" }
  ];

  const getPriceFormatted = (usdAmount: number, curr: "USD" | "INR" | "EUR") => {
    const amt = usdAmount * exchangeRates[curr];
    if (curr === "INR") {
      return `₹${Math.round(amt)}`;
    } else if (curr === "EUR") {
      return `€${amt.toFixed(2)}`;
    }
    return `$${amt}`;
  };

  // Pay as you GO calculations & validations
  const getPayAsYouGoLimitInfo = (curr: "USD" | "INR" | "EUR") => {
    if (curr === "INR") return { min: 250, label: "₹250" };
    if (curr === "EUR") return { min: 2.80, label: "€2.80" };
    return { min: 3, label: "$3" };
  };

  const amtNumeric = parseFloat(customAmount) || 0;
  const limitInfo = getPayAsYouGoLimitInfo(currency);
  const isCustomAmountValid = amtNumeric >= limitInfo.min;

  // Convert custom amount in selected currency back to USD to calculate tokens at 10,000 credits per USD
  const customUsdEquivalent = amtNumeric / exchangeRates[currency];
  const customTokens = Math.round(customUsdEquivalent * 10000);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    return parts.length > 0 ? parts.join(" ") : v;
  };

  const validateCardNumber = (num: string): boolean => {
    const clean = num.replace(/\s+/g, "");
    if (!/^\d{13,19}$/.test(clean)) return false;
    let sum = 0;
    let shouldDouble = false;
    for (let i = clean.length - 1; i >= 0; i--) {
      let digit = parseInt(clean.charAt(i), 10);
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  };

  const validateExpiry = (expiry: string): boolean => {
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;
    const [monthStr, yearStr] = expiry.split("/");
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10) + 2000;
    if (month < 1 || month > 12) return false;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;
    return true;
  };

  const validateCvc = (cvc: string): boolean => {
    return /^\d{3,4}$/.test(cvc);
  };

  const validateUpiId = (upi: string): boolean => {
    return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upi.trim());
  };

  // QR timer countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (paymentMethod === "qr" && showBuyModal && !paymentSuccess && !paymentFailed) {
      setQrSecondsLeft(300);
      setQrExpired(false);
      interval = setInterval(() => {
        setQrSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setQrExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [paymentMethod, showBuyModal, paymentSuccess, paymentFailed]);

  const formatQrTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const executeActualPayment = (shouldDecline: boolean) => {
    setIsProcessing(true);
    setPaymentSuccess(false);
    setPaymentFailed(false);
    setPaymentLogs([]);
    setPaymentSubStep("idle");

    const logs = shouldDecline ? [
      "[SECURE GATEWAY INITIATED]",
      "[ESTABLISHING ENCRYPTED CONNECTION TO MERCH ENG...]",
      "[CONTACTING BANKING NETWORKS WITH SECURED KEY...]",
      "[VERIFYING AUTHENTICITY SIGNATURE... FAILURE]",
      "[BANK SERVER ERROR CODE: ERR_DECLINED_INSUFFICIENT_FUNDS]",
      "[TRANSACTION TERMINATED SAFELY]"
    ] : [
      "[SECURE GATEWAY INITIATED]",
      "[ESTABLISHING ENCRYPTED CONNECTION TO MERCH ENG...]",
      "[CONTACTING BANKING NETWORKS WITH SECURED KEY...]",
      "[AUTHORIZING TRANSACTION FUNDS... VERIFIED]",
      "[COMMITTING TOKEN ALLOCATION ENTRIES... SUCCESS]",
      "[GATEWAY CONFIRMED: TRANSACTION SIGNED SECURELY]"
    ];

    let logIndex = 0;
    const interval = setInterval(() => {
      if (logIndex < logs.length) {
        setPaymentLogs((prev) => [...prev, logs[logIndex]]);
        logIndex++;
      } else {
        clearInterval(interval);
        setIsProcessing(false);
        if (shouldDecline) {
          setPaymentFailed(true);
        } else {
          setPaymentSuccess(true);
          
          // Determine tokens & price string to credit
          let finalTokens = 0;
          let finalPriceStr = "";
          if (selectedPack === "pay-as-you-go") {
            finalTokens = customTokens;
            finalPriceStr = currencySymbols[currency] + customAmount;
          } else {
            finalTokens = selectedPack.tokens;
            finalPriceStr = getPriceFormatted(selectedPack.usdPrice, currency);
          }

          onBuyTokens(buyTarget, finalTokens, finalPriceStr);
          
          setTimeout(() => {
            setShowBuyModal(false);
            setSelectedPack(null);
            setPaymentSuccess(false);
            setCardName("");
            setCardNumber("");
            setCardExpiry("");
            setCardCvc("");
            setUpiId("");
            setQrUtr("");
          }, 2200);
        }
      }
    }, 450);
  };

  const handleConfirmPayment = (shouldDecline: boolean) => {
    setValidationError(null);
    setOtpError(null);
    setPinError(null);

    if (!shouldDecline) {
      if (paymentMethod === "card") {
        if (!cardName.trim()) {
          setValidationError("Cardholder Name is required.");
          return;
        }
        if (!validateCardNumber(cardNumber)) {
          setValidationError("Invalid Credit Card Number. Please enter a valid 13-19 digit card passing Luhn validation.");
          return;
        }
        if (!validateExpiry(cardExpiry)) {
          setValidationError("Invalid Expiry Date. Please use MM/YY format with a future date.");
          return;
        }
        if (!validateCvc(cardCvc)) {
          setValidationError("Invalid CVC Code. Please enter 3 or 4 digits.");
          return;
        }

        // Card is validated, trigger SMS OTP verification
        setEnteredOtp("");
        setPaymentSubStep("bank-otp");
      } else if (paymentMethod === "gpay") {
        // Direct trigger Google Payment bottom sheet
        setUpiPin("");
        setPaymentSubStep("gpay-sheet");
      } else if (paymentMethod === "qr") {
        if (qrExpired) {
          setValidationError("The QR code session has expired. Please regenerate a new QR code first.");
          return;
        }
        if (!qrUtr || !/^\d{12}$/.test(qrUtr)) {
          setValidationError("Invalid Transaction ID. Please enter the real 12-digit UPI UTR/Ref No. from your payment app.");
          return;
        }

        executeActualPayment(false);
      }
    } else {
      executeActualPayment(true);
    }
  };

  return (
    <div id="dashboard-stats-component" className="flex-1 flex flex-col h-full w-full bg-[#0B0D17] text-white overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-850 bg-[#0E1121]">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="w-5 h-5 text-[#FF2DAA]" />
          <h2 className="text-lg font-display font-bold text-[#FF2DAA] tracking-tight">
            Zenith Control Center
          </h2>
        </div>
        <p className="text-xs text-gray-400">
          Monitor token consumption, manage subscription level, and view rolling windows.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#080A12]">
        {/* Rolling Window & Countdown */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-gray-950 to-gray-900 border border-gray-800 shadow-xl flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Universal 5-Hour Window
            </div>
            <div className="text-2xl font-mono font-bold text-[#00E5FF] mt-1 tracking-tight">
              {formatTime(countdownSeconds)}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Next reset: {new Date(usage.windowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Pool A */}
        <div className="p-4 rounded-xl bg-[#0F1225] border border-gray-850 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                Pool A
              </span>
              <h4 className="text-sm font-semibold text-white mt-0.5">
                Normal + Council + Dev + S-Mode
              </h4>
            </div>
            {usage.poolA.used >= usage.poolA.limit ? (
              <button
                onClick={() => {
                  setBuyTarget("poolA");
                  setSelectedPack(null);
                  setShowBuyModal(true);
                }}
                className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30 hover:bg-[#00E5FF]/30 transition-all cursor-pointer animate-pulse"
              >
                <Plus className="w-3 h-3" />
                BUY PACK
              </button>
            ) : (
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-400 border border-cyan-500/30">
                {poolAPct}% Used
              </span>
            )}
          </div>

          <div className="w-full bg-gray-950 h-3 rounded-full overflow-hidden border border-gray-800 p-0.5">
            <div
              style={{ width: `${poolAPct}%` }}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500 shadow-md shadow-cyan-500/20"
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 pt-1">
            <span>[ RAW COUNT HIDDEN ]</span>
            <span className="text-gray-400">Limit: {usage.poolA.limit.toLocaleString()} credits</span>
          </div>
        </div>

        {/* Pool B */}
        <div className="p-4 rounded-xl bg-[#0F1225] border border-gray-850 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono font-bold text-pink-400 uppercase tracking-widest block">
                Pool B
              </span>
              <h4 className="text-sm font-semibold text-white mt-0.5">
                Co-Model Mode
              </h4>
            </div>
            {(currentTier === "free" || usage.poolB.used >= usage.poolB.limit) && (
              <button
                onClick={() => {
                  setBuyTarget("poolB");
                  setSelectedPack(null);
                  setShowBuyModal(true);
                }}
                className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded bg-pink-950/40 text-pink-400 border border-pink-500/30 hover:bg-pink-900/30 transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                BUY PACK
              </button>
            )}
          </div>

          {currentTier === "free" ? (
            <div className="p-3 bg-red-950/20 border border-red-500/25 rounded-lg flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <p className="text-xs text-red-300 font-mono">
                LOCKED: Upgrade plan to activate.
              </p>
            </div>
          ) : (
            <>
              <div className="w-full bg-gray-950 h-3 rounded-full overflow-hidden border border-gray-800 p-0.5">
                <div
                  style={{ width: `${poolBPct}%` }}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 h-full rounded-full transition-all duration-500 shadow-md shadow-pink-500/20"
                />
              </div>

              <div className="flex justify-between items-center text-[11px] font-mono pt-1">
                <span className="text-gray-300">
                  {usage.poolB.used.toLocaleString()} / {usage.poolB.limit.toLocaleString()}
                </span>
                <span className="text-gray-500 uppercase text-[9px]">USED CREDITS</span>
              </div>
            </>
          )}
        </div>

        {/* Pool C */}
        <div className="p-4 rounded-xl bg-[#0F1225] border border-gray-850 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-widest block">
                Pool C
              </span>
              <h4 className="text-sm font-semibold text-white mt-0.5">
                Super Council Mode
              </h4>
            </div>
            {(limits.poolC === 0 || usage.poolC.used >= usage.poolC.limit) && (
              <button
                onClick={() => {
                  setBuyTarget("poolC");
                  setSelectedPack(null);
                  setShowBuyModal(true);
                }}
                className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded bg-purple-950/40 text-purple-400 border border-purple-500/30 hover:bg-purple-900/30 transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                BUY PACK
              </button>
            )}
          </div>

          {limits.poolC === 0 ? (
            <div className="p-3 bg-red-950/20 border border-red-500/25 rounded-lg flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <p className="text-xs text-red-300 font-mono">
                LOCKED: Available on Ultra & above.
              </p>
            </div>
          ) : (
            <>
              <div className="w-full bg-gray-950 h-3 rounded-full overflow-hidden border border-gray-800 p-0.5">
                <div
                  style={{ width: `${poolCPct}%` }}
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500 shadow-md shadow-purple-500/20"
                />
              </div>

              <div className="flex justify-between items-center text-[11px] font-mono pt-1">
                <span className="text-gray-300">
                  {usage.poolC.used.toLocaleString()} / {usage.poolC.limit.toLocaleString()}
                </span>
                <span className="text-gray-500 uppercase text-[9px]">USED CREDITS</span>
              </div>
            </>
          )}
        </div>

        {/* Chat History Section */}
        <div id="dashboard-chat-history-section" className="p-4 rounded-xl bg-[#0F1225] border border-gray-850 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Chat Thread History</h3>
            </div>
            <span className="text-[10px] font-mono text-gray-500 bg-gray-950 px-2 py-0.5 rounded border border-gray-900">
              {sessions.length} Threads
            </span>
          </div>

          {/* Mode Selector Filters */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
            {["all", "normal", "council", "comodel", "dev", "smode", "supercouncil"].map((m) => (
              <button
                key={m}
                onClick={() => setHistoryFilter(m as any)}
                className={`px-2 py-1 rounded text-[10px] font-mono capitalize whitespace-nowrap cursor-pointer border ${
                  historyFilter === m
                    ? "bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/30"
                    : "bg-gray-950 text-gray-400 border-gray-900 hover:border-gray-850"
                }`}
              >
                {m === "all" ? "All" : m === "comodel" ? "Co-Model" : m === "smode" ? "S-Mode" : m}
              </button>
            ))}
          </div>

          {/* Sessions List */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-500 font-mono">
                No threads found in this mode.
              </div>
            ) : (
              filteredSessions.map((session) => {
                const ageDays = session.createdAt
                  ? Math.floor((Date.now() - new Date(session.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                  : 0;
                const remainingDays = Math.max(0, 365 - ageDays);

                return (
                  <div
                    key={session.id}
                    className="p-3 rounded-lg bg-gray-950 border border-gray-900 hover:border-gray-800 transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs text-white truncate max-w-[140px]" title={session.name}>
                            {session.name}
                          </span>
                          <span className={`text-[8px] font-mono px-1 rounded uppercase tracking-wider ${
                            session.mode === "normal" ? "bg-cyan-950/50 text-cyan-400 border border-cyan-500/20" :
                            session.mode === "council" ? "bg-pink-950/50 text-pink-400 border border-pink-500/20" :
                            session.mode === "comodel" ? "bg-purple-950/50 text-purple-400 border border-purple-500/20" :
                            "bg-yellow-950/50 text-yellow-400 border border-yellow-500/20"
                          }`}>
                            {session.mode}
                          </span>
                        </div>
                        <p className="text-[9px] text-gray-500 font-mono mt-0.5">
                          Created: {session.createdAt ? new Date(session.createdAt).toLocaleDateString() : "Just now"}
                        </p>
                      </div>

                      {/* Status badge */}
                      <div>
                        {session.isPermanent ? (
                          <span className="inline-flex items-center gap-1 text-[8px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/20" title="Will not be deleted unless manually cleared">
                            <Lock className="w-2 h-2" /> Permanent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[8px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-500/20" title={`Subject to auto-cleanup 1 year after creation (${remainingDays} days remaining)`}>
                            <Clock className="w-2 h-2" /> Expires in {remainingDays}d
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Simulation and Actions panel */}
                    <div className="flex items-center justify-between border-t border-gray-900 pt-2 text-[9px] font-mono">
                      {/* Simulators */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => {
                            const date = new Date();
                            date.setDate(date.getDate() - 3);
                            if (onUpdateSession) {
                              onUpdateSession({
                                ...session,
                                createdAt: date.toISOString(),
                                isPermanent: false
                              });
                            }
                          }}
                          className="px-1.5 py-0.5 bg-gray-900 hover:bg-gray-850 rounded border border-gray-800 text-gray-400 hover:text-cyan-400 cursor-pointer transition-colors"
                          title="Set creation date to 3 days ago to test 'days ago' returning auto-permanency"
                        >
                          Simulate 3d Ago
                        </button>
                        <button
                          onClick={() => {
                            const date = new Date();
                            date.setFullYear(date.getFullYear() - 1);
                            date.setDate(date.getDate() - 10); // 1 year and 10 days ago
                            if (onUpdateSession) {
                              onUpdateSession({
                                ...session,
                                createdAt: date.toISOString()
                              });
                              if (onDeleteSessionDirect) {
                                onDeleteSessionDirect(session.id);
                              }
                            }
                          }}
                          className="px-1.5 py-0.5 bg-gray-900 hover:bg-gray-850 rounded border border-gray-800 text-red-400 hover:text-red-300 cursor-pointer transition-colors"
                          title="Set creation date to 1+ year ago to trigger automatic deletion"
                        >
                          Simulate 1yr+ Ago
                        </button>
                      </div>

                      {/* Main Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (onUpdateSession) {
                              onUpdateSession({
                                ...session,
                                isPermanent: !session.isPermanent
                              });
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-white cursor-pointer transition-colors"
                          title={session.isPermanent ? "Make Temporary" : "Keep Permanently"}
                        >
                          {session.isPermanent ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => {
                            if (onSelectSession) onSelectSession(session.id);
                          }}
                          className="px-2 py-0.5 bg-[#00E5FF]/20 hover:bg-[#00E5FF]/30 text-[#00E5FF] border border-[#00E5FF]/30 rounded cursor-pointer transition-all"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => {
                            if (onDeleteSessionDirect) onDeleteSessionDirect(session.id);
                          }}
                          className="p-1 text-red-500 hover:text-red-400 cursor-pointer transition-colors"
                          title="Delete thread permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Token Purchase & Secure Checkout Modal */}
      {showBuyModal && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fade-in select-none">
          <div className="w-full max-w-sm bg-[#0E1121] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full max-h-[min(580px,calc(100vh-2rem))]">
            
            {/* Modal Header */}
            <div className="p-3.5 bg-[#11152B] border-b border-gray-850 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {selectedPack ? (
                  <button
                    onClick={() => setSelectedPack(null)}
                    className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-all cursor-pointer mr-0.5"
                    title="Back to selections"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <Coins className="w-4.5 h-4.5 text-yellow-400" />
                )}
                <h3 className="font-display font-bold text-xs text-white tracking-wide uppercase">
                  {selectedPack ? "Secure Checkout" : "Buy Credit Pack"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowBuyModal(false);
                  setSelectedPack(null);
                }}
                className="text-gray-400 hover:text-white font-mono font-bold text-[10px] bg-gray-950 px-2 py-1 rounded border border-gray-850 hover:border-gray-700 cursor-pointer"
              >
                CLOSE
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              
              {/* TARGET POOL INFORMATION */}
              {!selectedPack && (
                <div className="p-3 bg-gray-950/80 rounded-xl border border-gray-850 flex items-center justify-between">
                  <div>
                    <span className="text-[8px] font-mono text-gray-500 uppercase block tracking-wider">Allocation Target</span>
                    <span className="text-xs font-mono font-bold text-cyan-400 capitalize">
                      {buyTarget === "poolA" ? "Pool A (Normal/S-Mode)" : buyTarget === "poolB" ? "Pool B (Co-Model)" : "Pool C (Super Council)"}
                    </span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                </div>
              )}

              {/* VIEW 1: SELECT A PACK */}
              {!selectedPack ? (
                <div className="space-y-2.5">
                  
                  {/* SHINING "PAY AS YOU GO!" OPTION FOR FREE USERS */}
                  {currentTier === "free" && (
                    <button
                      onClick={() => {
                        setSelectedPack("pay-as-you-go");
                        setCurrency("USD");
                      }}
                      className="w-full p-3.5 bg-gradient-to-r from-[#ffd700]/20 via-[#ff2daa]/15 to-[#00e5ff]/20 hover:from-[#ffd700]/35 hover:via-[#ff2daa]/30 hover:to-[#00e5ff]/35 border border-[#ffd700]/50 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer shadow-[0_0_15px_rgba(255,215,0,0.15)] hover:shadow-[0_0_25px_rgba(255,215,0,0.3)] relative overflow-hidden group active:scale-[0.98]"
                    >
                      {/* Shimmer overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                      
                      <div className="relative">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white tracking-wide uppercase bg-gradient-to-r from-yellow-300 via-pink-400 to-[#00E5FF] bg-clip-text text-transparent">
                            ✨ Pay as you GO!
                          </span>
                          <span className="px-1.5 py-[1px] text-[7px] font-mono bg-yellow-400 text-black font-bold rounded uppercase">
                            Flexible
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-300 block leading-tight mt-1 font-sans">
                          Only pay for what you need! Top up your balance before using.
                        </span>
                        <span className="text-[9px] text-yellow-300/80 font-mono block mt-1">
                          Min payment: $3 / ₹250 / €2.80
                        </span>
                      </div>
                      
                      <div className="px-3 py-1.5 bg-yellow-400/20 text-yellow-300 font-mono font-bold rounded-lg border border-yellow-400/40 text-[10px] shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                        TOP UP
                      </div>
                    </button>
                  )}

                  <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block pt-1">
                    Standard Permanent Credit Packs
                  </span>

                  <div className="space-y-2">
                    {standardPacks.map((pack) => (
                      <button
                        key={pack.name}
                        onClick={() => setSelectedPack(pack)}
                        className="w-full p-3 bg-gray-950 hover:bg-gray-900 border border-gray-850 hover:border-gray-700 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer group active:scale-[0.99]"
                      >
                        <div className="max-w-[70%]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white group-hover:text-[#00E5FF] transition-colors">{pack.name}</span>
                            <span className="text-[10px] font-mono text-gray-500">|</span>
                            <span className="text-[10px] font-mono text-emerald-400 font-bold">{pack.tokens.toLocaleString()} credits</span>
                          </div>
                          <span className="text-[9px] text-gray-500 block leading-tight mt-0.5">{pack.desc}</span>
                        </div>
                        <div className="px-2 py-1 bg-emerald-950/40 text-emerald-400 font-mono font-bold rounded border border-emerald-500/20 text-xs">
                          {getPriceFormatted(pack.usdPrice, currency)}
                        </div>
                      </button>
                    ))}
                  </div>

                  <p className="text-[8px] text-gray-500 font-mono text-center leading-normal pt-2">
                    * Extra credits are added permanently and never expire, bypassing standard 5-hour rolling limits!
                  </p>
                </div>
              ) : (
                
                // VIEW 2: CHECKOUT SCREEN
                <div className="space-y-4">
                  
                  {/* Currency selector at checkout */}
                  <div className="space-y-1">
                    <span className="text-[8px] font-mono text-gray-500 uppercase block tracking-wider">
                      Select Currency Option
                    </span>
                    <div className="grid grid-cols-3 gap-1 bg-gray-950 p-0.5 rounded-lg border border-gray-850">
                      {(["USD", "INR", "EUR"] as const).map((curr) => (
                        <button
                          key={curr}
                          onClick={() => setCurrency(curr)}
                          className={`py-1.5 text-[9px] font-mono font-bold rounded transition-all cursor-pointer uppercase ${
                            currency === curr
                              ? "bg-gray-800 text-[#00E5FF] border border-[#00E5FF]/20"
                              : "text-gray-400 hover:text-white"
                          }`}
                        >
                          {curr} ({currencySymbols[curr]})
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary card based on selection */}
                  {selectedPack === "pay-as-you-go" ? (
                    
                    // Custom Pay as you GO amount inputs
                    <div className="p-3 bg-gradient-to-r from-gray-950 to-gray-900 border border-yellow-500/30 rounded-xl space-y-3 shadow-md">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-850">
                        <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">
                          Pay as you GO Top Up
                        </span>
                        <span className="text-[9px] font-mono text-gray-400">10,000 credits / $1</span>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-mono text-gray-400 block">
                          Enter payment amount ({currency}):
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-gray-400 font-bold">
                            {currencySymbols[currency]}
                          </span>
                          <input
                            type="number"
                            min={limitInfo.min}
                            step={currency === "EUR" ? "0.10" : "1"}
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2 px-8 text-xs font-mono font-bold text-white focus:outline-none focus:border-yellow-400 placeholder-gray-700"
                            placeholder={limitInfo.min.toString()}
                          />
                        </div>
                        
                        {!isCustomAmountValid ? (
                          <div className="text-[9px] font-mono text-red-400 leading-tight flex items-center gap-1 pt-0.5">
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            <span>Minimum threshold: {limitInfo.label}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] font-mono text-emerald-400 leading-tight pt-0.5 flex justify-between items-center">
                            <span>Tokens to receive:</span>
                            <span className="font-bold">{customTokens.toLocaleString()} credits</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    
                    // Selected standard Pack summary
                    <div className="p-3 bg-gray-950 border border-gray-850 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[8px] font-mono text-gray-500 uppercase block">Selected Pack</span>
                        <span className="text-xs font-bold text-white">{selectedPack.name}</span>
                        <span className="text-[9px] text-gray-400 block mt-0.5">{selectedPack.tokens.toLocaleString()} Credits permanent allocation</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-mono text-gray-500 uppercase block">Total Price</span>
                        <span className="text-xs font-mono font-bold text-[#39FF14]">
                          {getPriceFormatted(selectedPack.usdPrice, currency)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Payment Methods Tab */}
                  <div className="space-y-1.5">
                    <span className="text-[8px] font-mono text-gray-500 uppercase block tracking-wider">
                      Secure Payment Methods
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: "card", label: "Card", icon: CreditCard },
                        { id: "gpay", label: "GPay", icon: Smartphone },
                        { id: "qr", label: "QR Code", icon: QrCode }
                      ].map((item) => {
                        const IconComponent = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setPaymentMethod(item.id as any)}
                            className={`py-1.5 px-0.5 flex flex-col items-center gap-1 rounded-xl border text-[8px] font-mono transition-all cursor-pointer ${
                              paymentMethod === item.id
                                ? "border-[#00E5FF] bg-[#00E5FF]/10 text-white font-bold"
                                : "border-gray-850 bg-gray-950/40 text-gray-400 hover:border-gray-800"
                            }`}
                          >
                            <IconComponent className="w-3.5 h-3.5" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment Inputs Area */}
                  <div className="p-3 bg-gray-950/60 border border-gray-850 rounded-xl min-h-[100px] flex flex-col justify-center">
                    
                    {paymentSubStep === "bank-otp" && (
                      <div className="space-y-4 text-left p-1 animate-fade-in font-sans">
                        <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-1">
                          <div className="flex items-center gap-1.5 text-cyan-400 font-display font-bold text-xs uppercase tracking-wide">
                            <Lock className="w-3.5 h-3.5" />
                            <span>3D Secure 2.0 Auth</span>
                          </div>
                          <span className="text-[8px] font-mono text-gray-500 bg-gray-950 px-1.5 py-0.5 rounded border border-gray-850">Verified by Visa</span>
                        </div>
                        
                        <div className="bg-gray-950 p-2.5 rounded-lg border border-gray-900 space-y-1 font-mono text-[9px] text-gray-300">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Merchant:</span>
                            <span className="text-white font-bold">ZENITH AI CORE SOLUTIONS</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Cardholder:</span>
                            <span className="text-white">{cardName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Card Number:</span>
                            <span className="text-white">•••• •••• •••• {cardNumber.slice(-4)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Amount:</span>
                            <span className="text-yellow-400 font-bold">
                              {selectedPack === "pay-as-you-go" ? currencySymbols[currency] + customAmount : getPriceFormatted(selectedPack.usdPrice, currency)}
                            </span>
                          </div>
                        </div>

                        <div className="bg-cyan-950/20 border border-cyan-500/20 p-2.5 rounded-lg space-y-1">
                          <span className="text-[9px] font-mono text-cyan-400 block font-bold uppercase">🔒 SECURE SMS PASSCODE SENT</span>
                          <p className="text-[9px] text-gray-300 leading-normal">
                            A single-use OTP has been dispatched to your bank's registered mobile number ending in ••••5678.
                          </p>
                          <p className="text-[10px] font-mono text-white mt-1">
                            For testing simulation, enter OTP: <span className="text-cyan-400 font-bold bg-gray-950 px-1 py-0.5 rounded border border-cyan-500/30">482910</span>
                          </p>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <label className="block text-[8px] font-mono text-gray-500 uppercase">Enter 6-Digit One-Time Password</label>
                          <input
                            type="text"
                            placeholder="Enter 6-digit OTP (482910)"
                            maxLength={6}
                            value={enteredOtp}
                            onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ""))}
                            className="w-full bg-gray-950 border border-cyan-900 focus:border-cyan-400 rounded-lg p-2 text-center font-mono text-xs tracking-[0.5em] text-white focus:outline-none"
                          />
                          {otpError && (
                            <span className="text-[9px] font-mono text-red-400 block text-center bg-red-950/30 border border-red-500/10 p-1.5 rounded">
                              {otpError}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <button
                            onClick={() => {
                              setPaymentSubStep("idle");
                              setValidationError("Card payment cancelled. No credits granted.");
                            }}
                            className="py-2 bg-gray-950 hover:bg-gray-900 border border-gray-850 text-gray-400 rounded-xl font-mono text-[9px] uppercase font-bold cursor-pointer transition-all"
                          >
                            Cancel / Decline
                          </button>
                          <button
                            onClick={() => {
                              if (enteredOtp === "482910") {
                                setOtpError(null);
                                executeActualPayment(false);
                              } else {
                                setOtpError("Incorrect OTP passcode entered. Please enter 482910 to simulate banking confirmation.");
                              }
                            }}
                            className="py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-mono text-[9px] uppercase font-bold cursor-pointer transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                          >
                            Verify OTP & Pay
                          </button>
                        </div>
                      </div>
                    )}

                    {paymentSubStep === "gpay-sheet" && (
                      <div className="space-y-4 text-left p-1 animate-fade-in font-sans">
                        <div className="flex items-center justify-between border-b border-gray-850 pb-2">
                          <div className="flex items-center gap-1.5">
                            <Smartphone className="w-4 h-4 text-[#00E5FF]" />
                            <span className="font-display font-bold text-xs text-white uppercase tracking-wide">Google Play Accounts</span>
                          </div>
                          <span className="text-[8px] font-mono text-gray-500 uppercase">Secure SDK Gateway</span>
                        </div>

                        <div className="text-[10px] text-gray-400 mb-1 leading-snug">
                          Choose your Google-linked payment method to process the subscription:
                        </div>

                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                          {[
                            { id: "sbi", label: "State Bank of India (SBI) - •••• 5421", balance: "INR 24,500.00 equivalent" },
                            { id: "hdfc", label: "HDFC Bank Savings - •••• 8901", balance: "INR 1,20,443.00 equivalent" },
                            { id: "paytm", label: "Paytm Payments Bank - •••• 2311", balance: "INR 1,500.00 equivalent" },
                            { id: "icici", label: "ICICI Bank - •••• 7731", balance: "INR 45,900.00 equivalent" }
                          ].map((bank) => {
                            const isSel = selectedBank === bank.label;
                            return (
                              <button
                                key={bank.id}
                                onClick={() => setSelectedBank(bank.label)}
                                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${isSel ? "bg-cyan-950/20 border-cyan-500/40 text-white" : "bg-gray-950 border-gray-900 text-gray-400 hover:border-gray-800"}`}
                              >
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-bold font-sans text-white">{bank.label}</span>
                                  <span className="text-[7.5px] font-mono text-gray-500 mt-0.5">{bank.balance}</span>
                                </div>
                                <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${isSel ? "border-cyan-500 bg-cyan-500" : "border-gray-800 bg-transparent"}`}>
                                  {isSel && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <button
                            onClick={() => {
                              setPaymentSubStep("idle");
                              setValidationError("Google account checkout cancelled. No credits granted.");
                            }}
                            className="py-2 bg-gray-950 hover:bg-gray-900 border border-gray-850 text-gray-400 rounded-xl font-mono text-[9px] uppercase font-bold cursor-pointer transition-all"
                          >
                            Cancel / Exit
                          </button>
                          <button
                            onClick={() => {
                              setPaymentSubStep("upi-pinpad");
                              setUpiPin("");
                              setPinError(null);
                            }}
                            className="py-2 bg-gradient-to-r from-emerald-500 to-[#00E5FF] hover:opacity-95 text-white rounded-xl font-mono text-[9px] uppercase font-bold cursor-pointer transition-all shadow-md"
                          >
                            Proceed to Pay
                          </button>
                        </div>
                      </div>
                    )}

                    {paymentSubStep === "upi-pinpad" && (
                      <div className="space-y-3 text-center p-1 animate-fade-in font-sans">
                        <div className="flex items-center justify-between border-b border-gray-850 pb-2">
                          <div className="flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5 text-amber-500" />
                            <span className="font-mono font-bold text-[10px] text-amber-500 uppercase tracking-wide">Secure UPI PIN Entry</span>
                          </div>
                          <span className="text-[8px] font-mono text-gray-500 uppercase">National Payments Corp of India</span>
                        </div>

                        <div className="text-[10px] text-gray-400 leading-tight">
                          Enter your confidential UPI PIN to authorize the transaction with <strong className="text-white font-sans">{selectedBank}</strong>:
                        </div>

                        <div className="flex justify-center items-center gap-2.5 py-1.5">
                          {[...Array(6)].map((_, idx) => {
                            const filled = upiPin.length > idx;
                            return (
                              <div
                                key={idx}
                                className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${filled ? "bg-white border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "bg-transparent border-gray-800"}`}
                              />
                            );
                          })}
                        </div>

                        {pinError && (
                          <span className="text-[8px] font-mono text-red-400 block bg-red-950/20 border border-red-500/10 py-1 px-2 rounded">
                            {pinError}
                          </span>
                        )}

                        <div className="text-[8.5px] font-mono text-gray-500">
                          * Standard Simulated PIN is <strong className="text-cyan-400 bg-gray-950 px-1 py-0.5 rounded border border-gray-900">999999</strong> (or click any 6 digits)
                        </div>

                        {/* Custom Numeric Pad 0-9 */}
                        <div className="grid grid-cols-3 gap-1.5 max-w-[210px] mx-auto pt-1 font-mono">
                          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                            <button
                              key={num}
                              onClick={() => {
                                if (upiPin.length < 6) {
                                  setUpiPin((prev) => prev + num);
                                  setPinError(null);
                                }
                              }}
                              className="h-7 bg-gray-950 hover:bg-gray-900 active:bg-gray-800 text-white rounded-lg border border-gray-900 text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
                            >
                              {num}
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              setPaymentSubStep("gpay-sheet");
                              setPinError(null);
                            }}
                            className="h-7 bg-red-950/20 hover:bg-red-900/40 text-red-400 rounded-lg border border-red-950/20 text-[8px] font-bold uppercase transition-all flex items-center justify-center cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              if (upiPin.length < 6) {
                                setUpiPin((prev) => prev + "0");
                                setPinError(null);
                              }
                            }}
                            className="h-7 bg-gray-950 hover:bg-gray-900 active:bg-gray-800 text-white rounded-lg border border-gray-900 text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
                          >
                            0
                          </button>
                          <button
                            onClick={() => {
                              if (upiPin === "999999" || upiPin.length === 6) {
                                setPinError(null);
                                executeActualPayment(false);
                              } else {
                                setPinError("Incorrect UPI PIN. Use simulated PIN '999999'.");
                              }
                            }}
                            className="h-7 bg-emerald-950/30 hover:bg-emerald-900/40 text-[#39FF14] rounded-lg border border-emerald-500/20 text-[8px] font-bold uppercase transition-all flex items-center justify-center cursor-pointer"
                          >
                            Confirm
                          </button>
                        </div>
                      </div>
                    )}

                    {paymentSubStep === "idle" && (
                      <>
                        {/* CREDIT CARD FIELDS */}
                        {paymentMethod === "card" && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[8px] font-mono text-gray-500 uppercase">Cardholder Name</label>
                                <input
                                  type="text"
                                  value={cardName}
                                  onChange={(e) => setCardName(e.target.value)}
                                  placeholder="John Doe"
                                  className="w-full bg-gray-950 border border-gray-850 rounded-lg p-1.5 text-[10px] font-mono focus:outline-none focus:border-gray-700 text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] font-mono text-gray-500 uppercase">Card Number</label>
                                <input
                                  type="text"
                                  value={cardNumber}
                                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                  placeholder="4111 2222 3333 4444"
                                  maxLength={19}
                                  className="w-full bg-gray-950 border border-gray-850 rounded-lg p-1.5 text-[10px] font-mono focus:outline-none focus:border-gray-700 text-white"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[8px] font-mono text-gray-500 uppercase">Expiry (MM/YY)</label>
                                <input
                                  type="text"
                                  value={cardExpiry}
                                  onChange={(e) => setCardExpiry(e.target.value)}
                                  placeholder="12/28"
                                  maxLength={5}
                                  className="w-full bg-gray-950 border border-gray-850 rounded-lg p-1.5 text-[10px] font-mono focus:outline-none focus:border-gray-700 text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] font-mono text-gray-500 uppercase">CVC</label>
                                <input
                                  type="password"
                                  value={cardCvc}
                                  onChange={(e) => setCardCvc(e.target.value)}
                                  placeholder="***"
                                  maxLength={3}
                                  className="w-full bg-gray-950 border border-gray-850 rounded-lg p-1.5 text-[10px] font-mono focus:outline-none focus:border-gray-700 text-white"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* GPAY / UPI ID FIELDS */}
                        {paymentMethod === "gpay" && (
                          <div className="space-y-3 text-center py-2 animate-fade-in">
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
                            <p className="text-[8.5px] text-gray-500 leading-normal font-sans">
                              * Opens Google Account Payment Methods in a new tab. After configuring or verifying, click CONFIRM PAYMENT below to finalize.
                            </p>
                          </div>
                        )}

                        {/* QR CODE GENERATOR */}
                        {paymentMethod === "qr" && (
                          <div className="flex flex-col items-center justify-center py-1 space-y-2 text-center">
                            <div className="flex items-center gap-1.5 bg-gray-950 border border-gray-900 px-3 py-1 rounded-full text-xs font-mono">
                              <span className={`w-1.5 h-1.5 rounded-full animate-ping ${qrExpired ? "bg-red-500" : "bg-emerald-400"}`} />
                              <span className="text-gray-500 uppercase font-bold text-[8px]">EXPIRES IN:</span>
                              <span className={`font-black tracking-wide font-mono ${qrExpired ? "text-red-400" : "text-[#FF2DAA]"}`}>
                                {formatQrTimer(qrSecondsLeft)}
                              </span>
                            </div>

                            <div className="relative bg-white p-1 rounded-lg shadow-inner">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&color=0e1121&data=${encodeURIComponent(
                                  `upi://pay?pa=zenithai@upi&pn=Zenith%20Gateway&am=${selectedPack === "pay-as-you-go" ? customAmount : selectedPack.usdPrice}&cu=USD&tn=CreditsPack`
                                )}`}
                                alt="Payment QR Code"
                                referrerPolicy="no-referrer"
                                className={`w-[100px] h-[100px] transition-all duration-300 ${qrExpired ? "opacity-10 blur-[1px] grayscale" : ""}`}
                              />

                              {qrExpired && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 bg-black/80 rounded-lg">
                                  <span className="text-[10px] font-mono text-red-400 font-bold uppercase">QR Expired</span>
                                  <button
                                    onClick={() => {
                                      setQrSecondsLeft(300);
                                      setQrExpired(false);
                                      setValidationError(null);
                                    }}
                                    className="mt-1 px-2 py-0.5 bg-red-900/40 hover:bg-red-900/60 text-white rounded text-[8px] font-mono font-bold transition-all cursor-pointer border border-red-500/20"
                                  >
                                    Regenerate
                                  </button>
                                </div>
                              )}
                            </div>
                            <div>
                              <span className="text-[8px] font-mono text-gray-500 uppercase block">Dynamic QR Code</span>
                              <span className="text-[8.5px] text-gray-400 block font-sans">
                                Scan with any smartphone UPI scanner. Must be completed within 5 minutes.
                              </span>
                            </div>
                            <div className="w-full space-y-1 text-left pt-1">
                              <label className="block text-[8px] font-mono text-gray-500 uppercase">12-Digit UPI Transaction Ref (UTR)</label>
                              <input 
                                type="text"
                                placeholder="Enter 12-digit UTR (e.g. 123456789012)"
                                maxLength={12}
                                value={qrUtr}
                                disabled={qrExpired}
                                onChange={(e) => setQrUtr(e.target.value.replace(/[^0-9]/g, ""))}
                                className="w-full bg-gray-950 border border-gray-850 rounded-lg p-1.5 text-[10px] font-mono text-gray-200 focus:outline-none focus:border-gray-700 text-white disabled:opacity-40"
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}

                  </div>

                  {/* EXECUTION FEEDBACK OR CONTROLS */}
                  {isProcessing ? (
                    <div className="space-y-2">
                      <span className="text-[8px] font-mono text-cyan-400 block tracking-wider uppercase animate-pulse">
                        🔄 INGRESS SECURITY VERIFICATION RUNNING...
                      </span>
                      <div className="p-3 bg-black border border-gray-850 rounded-xl h-28 overflow-y-auto font-mono text-[8.5px] text-gray-400 space-y-1 select-none leading-relaxed">
                        {paymentLogs.map((log, i) => (
                          <div
                            key={i}
                            className={
                              log.includes("FAILURE") || log.includes("TERMINATED")
                                ? "text-red-400"
                                : log.includes("SUCCESS") || log.includes("VERIFIED")
                                ? "text-emerald-400"
                                : "text-gray-400"
                            }
                          >
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : paymentSuccess ? (
                    <div className="flex flex-col items-center justify-center py-4 text-center space-y-1.5 bg-emerald-950/20 border border-emerald-500/20 rounded-xl animate-fade-in">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400 animate-bounce" />
                      <h4 className="text-xs font-mono font-bold text-emerald-400">Transaction Confirmed!</h4>
                      <p className="text-[9px] text-gray-400 max-w-[240px]">
                        Permanent credits loaded safely to your target pool balance.
                      </p>
                    </div>
                  ) : paymentFailed ? (
                    <div className="p-3.5 bg-red-950/20 border border-red-500/20 rounded-xl space-y-2 text-center animate-fade-in">
                      <div className="flex items-center justify-center gap-1 text-red-400 font-bold font-mono text-xs">
                        <AlertCircle className="w-4 h-4" />
                        <span>PAYMENT REJECTED</span>
                      </div>
                      <p className="text-[9px] text-red-300 font-sans leading-tight">
                        Bank server returned insufficient funds or authorization signatures declined. Check credentials.
                      </p>
                      <button
                        onClick={() => {
                          setPaymentFailed(false);
                          setPaymentLogs([]);
                        }}
                        className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-500/30 text-[9px] font-mono font-bold rounded-lg cursor-pointer mx-auto transition-colors"
                      >
                        RETRY CHECKOUT
                      </button>
                    </div>
                  ) : (
                    
                    // Core Real Checkout Button
                    <div className="flex flex-col gap-1.5 pt-1">
                      {validationError && (
                        <span className="text-[9px] font-mono text-red-400 block text-center bg-red-950/40 border border-red-500/20 py-1.5 rounded-lg">
                          {validationError}
                        </span>
                      )}
                      {paymentSubStep === "idle" && (
                        <button
                          onClick={() => handleConfirmPayment(false)}
                          disabled={selectedPack === "pay-as-you-go" && !isCustomAmountValid}
                          className="py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 border border-emerald-400/20 text-white font-mono font-bold text-[10px] rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Check className="w-3.5 h-3.5" />
                          CONFIRM PAYMENT
                        </button>
                      )}
                    </div>
                  )}

                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
