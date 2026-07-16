import React, { useState, useEffect } from "react";
import { PricingTier, TIER_LIMITS } from "../types.js";
import { 
  Cpu, 
  ShieldCheck, 
  Flame, 
  Sparkles, 
  ArrowRight, 
  CreditCard, 
  Lock, 
  AlertTriangle, 
  Calendar, 
  Hash, 
  User,
  X,
  ChevronRight,
  Fingerprint,
  TrendingUp,
  Award,
  Wallet,
  Coins,
  CheckCircle2,
  QrCode,
  Smartphone,
  Check,
  Zap,
  Clock,
  Laptop
} from "lucide-react";
import { auth, googleProvider, db } from "../lib/firebase.js";
import { signInWithPopup, signInWithRedirect, getRedirectResult, signInAnonymously, updateProfile, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";

interface OnboardingFlowProps {
  onComplete: (tier: PricingTier) => void;
  initialStep?: "cinematic" | "mcq" | "evaluating" | "recommendation" | "auth" | "payment";
}

interface MCQAnswers {
  q1: string;
  q2: string;
  q3: string;
  q4: string;
}

export default function OnboardingFlow({ onComplete, initialStep = "cinematic" }: OnboardingFlowProps) {
  const simplifyInterface = localStorage.getItem("zenith-simplify") === "true";

  // Navigation states: "cinematic" | "mcq" | "evaluating" | "recommendation" | "auth" | "payment"
  const [step, setStep] = useState<"cinematic" | "mcq" | "evaluating" | "recommendation" | "auth" | "payment">(initialStep);
  const [selectedTier, setSelectedTier] = useState<PricingTier>("pro");
  
  // MCQ state
  const [mcqIndex, setMcqIndex] = useState(0);
  const [answers, setAnswers] = useState<MCQAnswers>({
    q1: "",
    q2: "",
    q3: "",
    q4: ""
  });

  // Evaluating simulation states
  const [evalProgress, setEvalProgress] = useState(0);
  const [evalStatus, setEvalStatus] = useState("Analyzing your goals...");

  // Recommendation screen states
  const [showAllPlans, setShowAllPlans] = useState(false);

  // Auth state
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [demoEmail, setDemoEmail] = useState("freeuse200000@gmail.com");
  const [showDemoInput, setShowDemoInput] = useState(false);

  // Free warning popup state
  const [showFreeWarning, setShowFreeWarning] = useState(false);
  const [freeCountdown, setFreeCountdown] = useState(5);

  // Promo code states
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const [showGiftBoxAnim, setShowGiftBoxAnim] = useState(false);

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<"card" | "gpay" | "qr">("card");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [upiId, setUpiId] = useState("");
  const [qrUtr, setQrUtr] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [paymentLogs, setPaymentLogs] = useState<string[]>([]);

  // Check for redirect result on mount
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        setIsAuthenticating(true);
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          // Successfully logged in via redirect
          if (initialStep !== "auth") {
            proceedAfterAuth();
          } else {
            // Already handled by auth state listener in App, but just in case
          }
        }
      } catch (err: any) {
        console.error("Google Auth Redirect error:", err);
        setAuthError(err.message || "Failed to authenticate with Google. Please try again.");
      } finally {
        setIsAuthenticating(false);
      }
    };
    
    checkRedirectResult();
  }, []);

  // Interactive Payment Sub-Steps
  const [paymentSubStep, setPaymentSubStep] = useState<"idle" | "bank-otp" | "gpay-sheet" | "upi-pinpad">("idle");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState("State Bank of India - **** 5421");
  const [upiPin, setUpiPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [qrSecondsLeft, setQrSecondsLeft] = useState(300);
  const [qrExpired, setQrExpired] = useState(false);

  const plans = [
    {
      id: "free" as PricingTier,
      name: "Free",
      price: "$0",
      limitA: "8,000 cr",
      modes: "Normal only",
      models: "All 34",
      desc: "For basic exploration & light QA",
    },
    {
      id: "pro" as PricingTier,
      name: "Pro",
      price: "$9.99/mo",
      limitA: "100,000 cr",
      modes: "Normal, Council, Co-Model, Dev, S-Mode",
      models: "All 34",
      desc: "Perfect for power users & developers",
    },
    {
      id: "max" as PricingTier,
      name: "Max",
      price: "$19.99/mo",
      limitA: "250,000 cr",
      modes: "All 6 modes",
      models: "All 34",
      desc: "Maximum capacity for heavy coding & research",
    },
    {
      id: "ultra" as PricingTier,
      name: "Ultra",
      price: "$34.99/mo",
      limitA: "500,000 cr",
      modes: "All 6 modes + Super Council",
      models: "All 34",
      desc: "For extreme AI architects & teams",
    },
    {
      id: "ultrapromax" as PricingTier,
      name: "UltraProMax",
      price: "$59.99/mo",
      limitA: "1,000,000 cr",
      modes: "All modes, no soft limits",
      models: "All 34",
      desc: "The ultimate peak of AI power",
    },
  ];

  const mcqQuestions = [
    {
      id: "q1",
      question: "What will you use this app for?",
      options: [
        { label: "For personal use", value: "For personal use" },
        { label: "For Business", value: "For Business" }
      ]
    },
    {
      id: "q2",
      question: "What is your main goal?",
      options: [
        { label: "Develop an app/website", value: "Develop an app/website" },
        { label: "Learn coding", value: "Learn coding" }
      ]
    },
    {
      id: "q3",
      question: "How often do you plan to use the app each week?",
      options: [
        { label: "hourly", value: "hourly" },
        { label: "every day", value: "every day" },
        { label: "oftenly", value: "oftenly" },
        { label: "weekly", value: "weekly" }
      ]
    },
    {
      id: "q4",
      question: "Why you chose us?",
      options: [
        { label: "Because of more limits for less price", value: "Because of more limits for less price" },
        { label: "Because of many models at less price", value: "Because of many models at less price" },
        { label: "both", value: "both" }
      ]
    }
  ];

  // Cinematic timer
  useEffect(() => {
    if (step === "cinematic") {
      const timer = setTimeout(() => {
        setStep("mcq");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Evaluating simulation progress bar
  useEffect(() => {
    if (step === "evaluating") {
      setEvalProgress(0);
      const interval = setInterval(() => {
        setEvalProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            // Evaluate recommendation
            const rec = evaluateRecommendation();
            setSelectedTier(rec);
            setTimeout(() => {
              setStep("recommendation");
            }, 500);
            return 100;
          }
          
          const next = prev + 2;
          // Dynamically change text based on progress
          if (next < 25) {
            setEvalStatus("Analyzing your goals...");
          } else if (next < 50) {
            setEvalStatus("Synthesizing usage statistics...");
          } else if (next < 75) {
            setEvalStatus("Securing neural pathways...");
          } else {
            setEvalStatus("Recommending tailored plan...");
          }
          return next;
        });
      }, 100); // 100 * 50 = 5000ms (5 seconds)
      return () => clearInterval(interval);
    }
  }, [step]);

  // Recommendation engine logic
  const evaluateRecommendation = (): PricingTier => {
    const personalCheck = 
      answers.q1 === "For personal use" &&
      answers.q2 === "Learn coding" &&
      (answers.q3 === "every day" || answers.q3 === "oftenly" || answers.q3 === "weekly");
      
    const businessCheck = 
      answers.q1 === "For Business" &&
      answers.q2 === "Develop an app/website" &&
      (answers.q3 === "hourly" || answers.q3 === "every day");
      
    if (businessCheck) {
      return "max";
    } else if (personalCheck) {
      return "pro";
    }
    // Mixed options -> Pro plan
    return "pro";
  };

  const getRecommendationDetails = (tier: PricingTier) => {
    if (tier === "max") {
      return {
        title: "Max Plan",
        subtitle: "Best fit for your business",
        price: "$19.99/mo",
        limits: "250,000 cr",
        modes: "All 6 modes",
        reason: "We recommend this plan because it provides elite, production-grade parameters for business development and frequent website coding. It boasts a massive 250,000 Pool A credits, access to all 6 developer modes, and priority routing to handle high-volume technical tasks and real-time app generations."
      };
    } else {
      return {
        title: "Pro Plan",
        subtitle: "Best fit for you",
        price: "$9.99/mo",
        limits: "100,000 cr",
        modes: "5 Modes",
        reason: "We recommend this plan because it perfectly aligns with your learning journey and daily exploration needs. It features 100,000 Pool A credits per reset, and grants access to 5 premium developer modes—including Council and Co-Model—to help you learn coding and build projects with maximum guidance without high enterprise overhead."
      };
    }
  };

  const currentPlanObj = plans.find(p => p.id === selectedTier) || plans[1];
  const recommendationInfo = getRecommendationDetails(selectedTier);

  // MCQ handler
  const handleMCQSelect = (value: string) => {
    const currentQ = mcqQuestions[mcqIndex];
    setAnswers((prev) => ({ ...prev, [currentQ.id]: value }));
    
    if (mcqIndex < mcqQuestions.length - 1) {
      setMcqIndex((prev) => prev + 1);
    } else {
      setStep("evaluating");
    }
  };

  // Google Sign In

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      if (initialStep !== "auth") {
        proceedAfterAuth();
      }
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setAuthError(err.message || "Failed to authenticate. Please try again.");
      setIsAuthenticating(false);
    }
  };

  // Simulated Google Auth
  const handleSimulatedSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const credential = await signInAnonymously(auth);
      if (credential.user) {
        localStorage.setItem("zenith-auth-email", demoEmail);
        await updateProfile(credential.user, {
          displayName: demoEmail.split("@")[0],
          photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${demoEmail}`
        });
      }
      if (initialStep !== "auth") {
        proceedAfterAuth();
      }
    } catch (err: any) {
      console.error("Simulated Auth error:", err);
      setAuthError("Failed to initiate simulated login: " + err.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const proceedAfterAuth = () => {
    if (selectedTier === "free") {
      onComplete("free");
    } else {
      setStep("payment");
    }
  };

  const handleSelectPlanAndProceed = (tier: PricingTier) => {
    setSelectedTier(tier);
    if (tier === "free") {
      setShowFreeWarning(true);
    } else {
      // Check if user is already authenticated
      if (auth.currentUser) {
        setStep("payment");
      } else {
        setStep("auth");
      }
    }
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
    if (paymentMethod === "qr" && step === "payment" && !paymentSuccess && !paymentFailed) {
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
  }, [paymentMethod, step, paymentSuccess, paymentFailed]);

  const formatQrTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const executeActualPayment = async (shouldFail: boolean = false) => {
    if (!shouldFail && isPromoApplied) {
      // Just check one last time that it is not expired
      try {
        const promoDocRef = doc(db, "promocodes", "ZEN26ZX");
        const docSnap = await getDoc(promoDocRef);
        const claimsCount = docSnap.exists() ? (docSnap.data().claimCount || 0) : 0;
        if (claimsCount >= 20) {
          setPromoError("This promo code has just expired (reached 20 claims).");
          setIsPromoApplied(false);
          setPromoSuccess(null);
          setSelectedTier("pro"); // Keep selectedTier as pro but remove discount
          setPaymentSubStep("idle");
          return;
        }
        // Write the increment!
        await setDoc(promoDocRef, { claimCount: claimsCount + 1 }, { merge: true });
      } catch (err: any) {
        console.error("Error saving promo claim count:", err);
      }
    }

    setIsProcessingPayment(true);
    setPaymentSuccess(false);
    setPaymentFailed(false);
    setPaymentLogs([]);
    setPaymentSubStep("idle");
    
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
        setIsProcessingPayment(false);
        if (shouldFail) {
          setPaymentFailed(true);
        } else {
          setPaymentSuccess(true);
          setTimeout(() => {
            onComplete(selectedTier);
          }, 2500); // Wait for the gorgeous success animation to show
        }
      }
    }, 450);
  };

  // Payment triggers with simulated terminal logs
  const handleConfirmPayment = async (shouldFail: boolean = false) => {
    setValidationError(null);
    setOtpError(null);
    setPinError(null);

    if (!shouldFail) {
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
        
        // Card is valid, redirect user to 3D Secure Verification
        setEnteredOtp("");
        setPaymentSubStep("bank-otp");
      } else if (paymentMethod === "gpay") {
        if (!validateUpiId(upiId)) {
          setValidationError("Invalid UPI Address. Please enter a valid format like user@upi.");
          return;
        }
        
        // UPI address is valid, open Google Play Payment sheet
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
        
        // QR transaction is valid
        executeActualPayment(false);
      }
    } else {
      executeActualPayment(true);
    }
  };

  // Free warning popup timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showFreeWarning) {
      setFreeCountdown(5);
      timer = setInterval(() => {
        setFreeCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showFreeWarning]);

  const handleApplyPromoCode = async () => {
    if (!promoCode || promoCode.trim() === "") return;
    
    setPromoError(null);
    setPromoSuccess(null);
    setIsApplyingPromo(true);
    
    try {
      const codeClean = promoCode.trim().toUpperCase();
      
      if (codeClean !== "ZEN26ZX") {
        setPromoError("Invalid promo code.");
        setIsApplyingPromo(false);
        return;
      }
      
      // Promo code claiming requires a payment method added
      let hasPaymentMethod = false;
      if (paymentMethod === "card") {
        hasPaymentMethod = !!(cardName.trim() && cardNumber.trim() && cardExpiry.trim() && cardCvc.trim());
        if (hasPaymentMethod) {
          if (!validateCardNumber(cardNumber) || !validateExpiry(cardExpiry) || !validateCvc(cardCvc)) {
            setPromoError("Your card details are invalid. Please fill in a valid payment method first.");
            setIsApplyingPromo(false);
            return;
          }
        }
      } else if (paymentMethod === "gpay") {
        hasPaymentMethod = !!upiId.trim();
        if (hasPaymentMethod) {
          if (!validateUpiId(upiId)) {
            setPromoError("Your UPI details are invalid. Please fill in a valid payment method first.");
            setIsApplyingPromo(false);
            return;
          }
        }
      } else if (paymentMethod === "qr") {
        hasPaymentMethod = !!qrUtr.trim();
        if (hasPaymentMethod) {
          if (!/^\d{12}$/.test(qrUtr)) {
            setPromoError("Your QR payment UTR reference is invalid (must be 12 digits). Please enter a valid one.");
            setIsApplyingPromo(false);
            return;
          }
        }
      }
      
      if (!hasPaymentMethod) {
        setPromoError("Claiming this promo code requires a payment method added. Please fill in your Card or UPI details first.");
        setIsApplyingPromo(false);
        return;
      }
      
      // Query Firestore for first 20 claims
      const promoDocRef = doc(db, "promocodes", "ZEN26ZX");
      const docSnap = await getDoc(promoDocRef);
      let claimsCount = 0;
      if (docSnap.exists()) {
        claimsCount = docSnap.data().claimCount || 0;
      } else {
        await setDoc(promoDocRef, { claimCount: 0 });
      }
      
      if (claimsCount >= 20) {
        setPromoError("Code is expired.");
        setIsApplyingPromo(false);
        return;
      }
      
      // Trigger Gift Box opening animation!
      setShowGiftBoxAnim(true);
      
      // Delay applying promo results to show off the opening gift box animation
      setTimeout(() => {
        setShowGiftBoxAnim(false);
        setIsPromoApplied(true);
        setPromoSuccess("Promo Code Applied! Pro Plan for FREE is active (first month 100% off).");
        setSelectedTier("pro");
      }, 3500);
      
    } catch (err: any) {
      console.error("Promo code application error:", err);
      setPromoError("Failed to apply promo code: " + err.message);
    } finally {
      setIsApplyingPromo(false);
    }
  };

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

  return (
    <div id="onboarding-flow" className="flex-1 flex flex-col justify-center items-center p-6 bg-[#0B0D15] text-gray-100 select-none relative overflow-hidden h-full w-full font-sans">
      {/* Subtle background accent */}
      {!simplifyInterface && (
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "radial-gradient(#00E5FF 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      )}

      <AnimatePresence mode="wait">
        {/* Step 1: Cinematic Welcome Screen */}
        {step === "cinematic" && (
          <motion.div
            key="cinematic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm flex flex-col items-center justify-center text-center space-y-10 z-10 p-4"
          >
            <div className="relative">
              <motion.div 
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: [0.3, 1.15, 1], opacity: 1 }}
                transition={{ duration: 2.8, ease: "easeOut" }}
                className="absolute -inset-4 rounded-full bg-gradient-to-r from-[#00E5FF] to-[#FF2DAA] opacity-35 blur-xl"
              />
              <motion.div
                initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="relative w-24 h-24 bg-[#0E1121] rounded-full flex items-center justify-center border border-gray-800"
              >
                <Cpu className="w-12 h-12 text-[#00E5FF]" />
              </motion.div>
            </div>

            <div className="space-y-4">
              <motion.h1 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [0.5, 1.05, 1], opacity: 1 }}
                transition={{ delay: 0.4, duration: 2.2, ease: "easeOut" }}
                className="text-4xl font-display font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] via-purple-400 to-[#FF2DAA] uppercase"
              >
                ZENITH AI
              </motion.h1>
              
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5, duration: 1.5, ease: "easeOut" }}
                className="space-y-1.5"
              >
                <p className="text-sm font-sans font-medium text-gray-300 italic tracking-wide">
                  your own lead engineer
                </p>
                <p className="text-xs font-mono font-bold text-[#39FF14] uppercase tracking-widest">
                  of infinite ideas
                </p>
              </motion.div>
            </div>

            {/* Quick Skip Option */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              whileHover={{ opacity: 1 }}
              onClick={() => setStep("mcq")}
              className="px-4 py-1.5 border border-gray-800 hover:border-gray-700 bg-gray-950/40 rounded-full text-[10px] font-mono uppercase tracking-widest cursor-pointer text-gray-400 transition-all"
            >
              Skip Intro
            </motion.button>
          </motion.div>
        )}

        {/* Step 2: MCQ Questions */}
        {step === "mcq" && (
          <motion.div
            key="mcq"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-sm flex flex-col justify-between z-10 p-4 h-[560px]"
          >
            <div>
              {/* Step indicator */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between items-center text-[10px] font-mono text-gray-500">
                  <span>ONBOARDING PROFILE</span>
                  <span>QUESTION {mcqIndex + 1} OF 4</span>
                </div>
                <div className="h-1 bg-gray-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#00E5FF] to-[#FF2DAA] transition-all duration-300"
                    style={{ width: `${((mcqIndex + 1) / 4) * 100}%` }}
                  />
                </div>
              </div>

              {/* Current Question */}
              <div className="text-left space-y-6">
                <span className="text-[10px] font-mono text-[#39FF14] uppercase tracking-widest flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Cognitive Assessment
                </span>
                <h2 className="text-xl font-display font-black tracking-tight text-white leading-snug">
                  {mcqQuestions[mcqIndex].question}
                </h2>
              </div>
            </div>

            {/* Options list */}
            <div className="space-y-3 my-6">
              {mcqQuestions[mcqIndex].options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleMCQSelect(opt.value)}
                  className="w-full text-left p-5 rounded-2xl border border-gray-800 hover:border-purple-500/30 bg-white/5 hover:bg-white/10 transition-all cursor-pointer flex justify-between items-center group active:scale-[0.98]"
                >
                  <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors capitalize">
                    {opt.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-all transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>

            {/* Back indicator */}
            <div className="flex justify-center">
              {mcqIndex > 0 && (
                <button
                  onClick={() => setMcqIndex((prev) => prev - 1)}
                  className="text-xs text-gray-500 hover:text-white font-mono underline uppercase tracking-wider cursor-pointer"
                >
                  Previous Question
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 3: 5-Second Evaluating Screen */}
        {step === "evaluating" && (
          <motion.div
            key="evaluating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm flex flex-col items-center justify-center text-center space-y-8 z-10 p-4"
          >
            <div className="relative">
              <div className="w-20 h-20 rounded-full border border-[#00E5FF]/20 flex items-center justify-center relative">
                <div className="absolute inset-0 rounded-full border border-t-[#FF2DAA] border-r-transparent border-l-transparent animate-spin" style={{ animationDuration: "1s" }} />
                <div className="absolute -inset-1 rounded-full border border-b-[#00E5FF] border-t-transparent border-r-transparent border-l-transparent animate-spin" style={{ animationDuration: "1.8s" }} />
                <Sparkles className="w-8 h-8 text-[#00E5FF] animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-display font-bold text-white uppercase tracking-wider">
                Best plan for your use case
              </h3>
              <p className="text-[11px] font-mono text-gray-500">
                AI MODEL PARAMETERS INGESTION IN PROGRESS...
              </p>
            </div>

            {/* Progress metrics */}
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between items-center text-[9px] font-mono text-[#39FF14]">
                <span>{evalStatus}</span>
                <span>{evalProgress}%</span>
              </div>
              <div className="h-1 bg-gray-950 border border-gray-900 rounded-full overflow-hidden p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-[#00E5FF] via-purple-500 to-[#FF2DAA] rounded-full transition-all duration-100"
                  style={{ width: `${evalProgress}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 4: Plan Recommendation */}
        {step === "recommendation" && (
          <motion.div
            key="recommendation"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm flex flex-col justify-between h-full z-10 p-4 overflow-y-auto max-h-[640px] scrollbar-none"
          >
            {!showAllPlans ? (
              // Recommended plan view
              <div className="space-y-5 my-auto">
                <div className="text-center space-y-1">
                  <span className="text-[9px] font-mono bg-emerald-950/40 text-[#39FF14] border border-[#39FF14]/30 px-3 py-1 rounded-full uppercase tracking-widest inline-block">
                    {recommendationInfo.subtitle}
                  </span>
                  <h2 className="text-2xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                    Your Tailored License
                  </h2>
                </div>

                {/* Recommendation Card */}
                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl relative shadow-lg backdrop-blur-sm overflow-hidden">
                  
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="text-[10px] font-mono text-cyan-400 block uppercase tracking-widest mb-1">Recommended</span>
                      <h3 className="text-2xl font-display font-bold tracking-tight text-white capitalize">
                        {recommendationInfo.title}
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-display font-bold text-white">{recommendationInfo.price}</span>
                      <span className="text-[10px] text-gray-500 block">per month</span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-400 leading-relaxed mb-6 border-b border-white/10 pb-5">
                    All 34 AI models enabled instantly. Advanced comparison & co-model protocols loaded.
                  </p>

                  {/* Highlights */}
                  <div className="grid grid-cols-2 gap-4 mb-6 text-xs font-mono">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col">
                      <span className="text-[9px] text-gray-500 uppercase">Limit Pool A</span>
                      <span className="font-bold text-emerald-400 mt-1">{recommendationInfo.limits}</span>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col">
                      <span className="text-[9px] text-gray-500 uppercase">Modes</span>
                      <span className="font-bold text-cyan-400 mt-1 truncate">{recommendationInfo.modes}</span>
                    </div>
                  </div>

                  {/* Recommendation Reason */}
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2 text-left">
                    <span className="text-[10px] font-mono text-pink-400 uppercase block font-bold">
                      Why this plan?
                    </span>
                    <p className="text-xs text-gray-400 font-sans leading-relaxed">
                      {recommendationInfo.reason}
                    </p>
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  onClick={() => handleSelectPlanAndProceed(selectedTier)}
                  className="w-full py-3 bg-gradient-to-r from-[#00E5FF] via-purple-600 to-[#FF2DAA] rounded-xl font-display font-bold text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Activate {recommendationInfo.title}
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Secondary see other plans link */}
                <button
                  onClick={() => setShowAllPlans(true)}
                  className="w-full text-center text-xs text-gray-500 hover:text-white font-mono underline uppercase tracking-wider cursor-pointer"
                >
                  See Other Plans
                </button>
              </div>
            ) : (
              // See other plans view
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-gray-850 pb-3 mb-1">
                  <span className="text-xs font-mono font-bold text-[#00E5FF]">ALL ZENITH VERSIONS</span>
                  <button 
                    onClick={() => setShowAllPlans(false)} 
                    className="text-gray-500 hover:text-white text-xs font-mono flex items-center gap-1 cursor-pointer"
                  >
                    Back to Recommended
                  </button>
                </div>

                <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                  {plans.map((plan) => {
                    const isRec = plan.id === selectedTier;
                    return (
                      <div
                        key={plan.id}
                        onClick={() => handleSelectPlanAndProceed(plan.id)}
                        className={`p-5 bg-white/5 border rounded-2xl cursor-pointer transition-all relative text-left ${
                          isRec
                            ? "border-pink-500/50 bg-white/10"
                            : "border-white/5 hover:border-white/10"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-display font-bold text-sm text-white capitalize flex items-center gap-2">
                            {plan.name}
                            {isRec && <span className="text-[9px] font-mono bg-pink-500 text-white px-2 py-0.5 rounded-full uppercase">Rec</span>}
                          </span>
                          <span className="font-display text-sm text-cyan-400 font-bold">
                            {plan.price}
                          </span>
                        </div>

                        <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                          {plan.desc}
                        </p>

                        <div className="flex gap-4 text-[10px] font-mono pt-3 border-t border-white/5">
                          <div className="text-gray-500 flex items-center gap-1.5">
                            <Flame className="w-3 h-3 text-pink-400" />
                            Pool A: <span className="text-gray-300 font-medium">{plan.limitA}</span>
                          </div>
                          <div className="text-gray-500 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-cyan-400" />
                            Modes: <span className="text-gray-300 font-medium">{plan.id === "free" ? "Normal" : plan.id === "pro" ? "5 Modes" : "All 6"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 5: Firebase Auth Screen */}
        {step === "auth" && (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm flex flex-col items-center justify-center text-center space-y-6 z-10 p-4"
          >
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#00E5FF] to-[#FF2DAA] opacity-70 blur-md" />
              <div className="relative w-16 h-16 bg-gray-950 rounded-full flex items-center justify-center border border-gray-800">
                <Lock className="w-8 h-8 text-[#00E5FF]" />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-display font-bold text-white uppercase tracking-wider">
                Secure Zenith Identity
              </h2>
              <p className="text-xs text-gray-400 max-w-xs leading-normal">
                Create your secure user profile to link and authenticate your premium plan.
              </p>
            </div>

            <div className="w-full space-y-4 pt-2">
              <button
                onClick={handleGoogleSignIn}
                disabled={isAuthenticating}
                className="w-full py-3 px-4 bg-white hover:bg-gray-100 text-gray-900 rounded-xl font-bold flex items-center justify-center gap-3 transition-all duration-200 shadow-lg cursor-pointer transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                <svg className="w-4 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="font-sans text-xs tracking-wide">
                  {isAuthenticating ? "Connecting..." : "Continue with Google"}
                </span>
              </button>

              {authError && (
                <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-left space-y-1.5">
                  <p className="text-[10px] text-red-400 leading-normal font-mono">{authError}</p>
                </div>
              )}

              <div className="flex justify-center items-center gap-1.5 text-[9px] font-mono text-gray-500 pt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#39FF14]" />
                Secured via Firebase Sync protocols
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 6: Cyber Payment Terminal */}
        {step === "payment" && (
          <motion.div
            key="payment"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm flex flex-col justify-between h-full z-10 p-4 overflow-y-auto max-h-[640px] scrollbar-none"
          >
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF2DAA] to-purple-400 flex items-center justify-center gap-1.5">
                  <CreditCard className="w-5 h-5 text-[#FF2DAA]" />
                  Zenith Payment Terminal
                </h2>
                <p className="text-[10px] text-gray-400">
                  Select payment route for your {currentPlanObj.name} subscription.
                </p>
              </div>

              {/* Plan checkout item summary */}
              <div className="p-3.5 bg-gray-950/70 border border-purple-500/15 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[8px] font-mono text-gray-500 uppercase block">Purchase Version</span>
                    <span className="font-bold text-white capitalize">
                      {isPromoApplied ? "Pro Version License (Promo Applied)" : `${currentPlanObj.name} Version License`}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    {isPromoApplied ? (
                      <>
                        <span className="text-[9.5px] font-mono text-gray-500 line-through">$9.99/mo</span>
                        <span className="font-mono font-bold text-[#39FF14] text-sm">$0.00</span>
                      </>
                    ) : (
                      <span className="font-mono font-bold text-[#00E5FF] text-sm">{currentPlanObj.price}</span>
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

              {/* Promo Code Input Block */}
              {!isPromoApplied ? (
                <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-850 space-y-2 text-left">
                  <span className="text-[9px] font-mono text-gray-500 uppercase block tracking-wider">Do you have a promo code?</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter code"
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
                  <div className="p-2.5 bg-emerald-950/25 border border-emerald-500/20 rounded-xl text-left">
                    <span className="text-[10.5px] text-[#39FF14] font-mono leading-tight block">{promoSuccess}</span>
                  </div>
                )
              )}

              {/* Payment Methods Tab */}
              <div className="grid grid-cols-3 gap-1 bg-[#090B15] p-1 border border-gray-850 rounded-xl">
                {[
                  { id: "card", label: "Card", icon: CreditCard },
                  { id: "gpay", label: "UPI", icon: Smartphone },
                  { id: "qr", label: "QR Code", icon: QrCode }
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

              {/* Interactive payment body */}
              {isProcessingPayment ? (
                // Terminal logging during processing
                <div className="p-4 bg-black border border-gray-850 rounded-xl font-mono text-[9px] text-gray-400 space-y-2 text-left h-[260px] overflow-y-auto flex flex-col justify-end">
                  <div className="space-y-1.5 flex-1">
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
              ) : paymentSuccess ? (
                // Successful payment check with rich animation
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center justify-center text-center py-6 px-4 space-y-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl h-[260px] relative overflow-hidden"
                >
                  {/* Floating particles effect */}
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: i % 3 === 0 ? "#39FF14" : i % 3 === 1 ? "#00E5FF" : "#FFD700",
                        left: `${10 + Math.random() * 80}%`,
                        top: `${10 + Math.random() * 80}%`,
                      }}
                      animate={{
                        y: [-10, -80],
                        x: [0, (Math.random() - 0.5) * 30],
                        scale: [1, 0],
                        opacity: [1, 0]
                      }}
                      transition={{
                        duration: 1.5 + Math.random() * 1,
                        repeat: Infinity,
                        delay: Math.random() * 0.5
                      }}
                    />
                  ))}
                  <div className="relative">
                    <motion.div
                      animate={{ scale: [1, 1.15, 1], rotate: 360 }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="w-14 h-14 rounded-full bg-emerald-500/20 border border-[#39FF14] flex items-center justify-center text-[#39FF14] shadow-[0_0_20px_rgba(57,255,20,0.3)]"
                    >
                      <Check className="w-8 h-8 stroke-[3]" />
                    </motion.div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-display font-black text-[#39FF14] uppercase tracking-wider">
                      PAYMENT CONFIRMED
                    </h3>
                    <p className="text-xs text-gray-200">
                      License for <span className="font-bold capitalize text-white">{currentPlanObj.name} Plan</span> active!
                    </p>
                    <p className="text-[10px] text-gray-400 max-w-[240px] mx-auto pt-1 leading-snug">
                      Your permanent credits have been provisioned. Launching your workspace dashboard now...
                    </p>
                  </div>
                </motion.div>
              ) : paymentFailed ? (
                // Failed payment check with shake animation
                <motion.div
                  initial={{ x: [-10, 10, -10, 10, 0], opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col items-center justify-center text-center py-6 px-4 space-y-4 bg-red-950/20 border border-red-500/30 rounded-2xl h-[260px] relative"
                >
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
                  
                  <button
                    onClick={() => {
                      setPaymentFailed(false);
                      setIsProcessingPayment(false);
                    }}
                    className="px-4 py-1 bg-red-900/40 hover:bg-red-900/60 text-red-200 hover:text-white border border-red-500/30 rounded-xl text-[10px] font-mono font-bold transition-all uppercase cursor-pointer"
                  >
                    Retry Payment
                  </button>
                </motion.div>
              ) : (
                // Static or interactive checkout sub-step layouts
                <div className="min-h-[260px] bg-gray-950/20 p-3 rounded-xl border border-gray-900 flex flex-col justify-center">
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
                          <span className="text-yellow-400 font-bold">{currentPlanObj.price}</span>
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
                            setValidationError("Card payment cancelled. No plan access was granted.");
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
                            setValidationError("Google account checkout cancelled. No plan access was granted.");
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
                          className="h-7 bg-red-950/20 hover:bg-red-950/40 text-red-400 rounded-lg border border-red-950/20 text-[8px] font-bold uppercase transition-all flex items-center justify-center cursor-pointer"
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
                      {paymentMethod === "card" && (
                        <div className="space-y-2.5 text-left">
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
                        <div className="space-y-4 text-left">
                          <div>
                            <label className="block text-[8px] font-mono text-gray-500 uppercase mb-1.5">Google Pay / UPI address</label>
                            <div className="relative">
                              <Smartphone className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-600" />
                              <input 
                                type="text"
                                placeholder="Enter UPI Address (username@bank)"
                                value={upiId}
                                onChange={(e) => setUpiId(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-850 rounded-lg p-2 pl-8 text-[11px] font-mono text-gray-200 focus:outline-none focus:border-[#FF2DAA]"
                              />
                            </div>
                          </div>
                          
                          <div className="p-3 bg-gray-950 border border-gray-850 rounded-lg text-[9px] text-gray-400 font-mono flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 text-[#00E5FF] flex-shrink-0" />
                            <span>This will securely query linked Google accounts for authorization.</span>
                          </div>
                        </div>
                      )}

                      {paymentMethod === "qr" && (() => {
                        const priceValue = parseFloat(currentPlanObj.price.replace(/[^0-9.]/g, '')) || 9.99;
                        const upiUri = `upi://pay?pa=zenithai@upi&pn=Zenith%20AI&am=${priceValue}&cu=USD&tn=Zenith%20${currentPlanObj.name}%20Onboarding`;
                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUri)}`;
                        return (
                          <div className="flex flex-col items-center justify-center p-2 text-center space-y-3">
                            <div className="flex items-center gap-1.5 bg-gray-950 border border-gray-900 px-3 py-1 rounded-full text-xs font-mono">
                              <span className={`w-1.5 h-1.5 rounded-full animate-ping ${qrExpired ? "bg-red-500" : "bg-emerald-400"}`} />
                              <span className="text-gray-500 uppercase font-bold text-[8px]">EXPIRES IN:</span>
                              <span className={`font-black tracking-wide font-mono ${qrExpired ? "text-red-400" : "text-[#FF2DAA]"}`}>
                                {formatQrTimer(qrSecondsLeft)}
                              </span>
                            </div>

                            <div className="relative p-2 bg-white rounded-xl inline-block shadow-lg">
                              <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 ${qrExpired ? "border-gray-500" : "border-[#FF2DAA]"}`} />
                              <div className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 ${qrExpired ? "border-gray-500" : "border-[#FF2DAA]"}`} />
                              <div className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 ${qrExpired ? "border-gray-500" : "border-[#FF2DAA]"}`} />
                              <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 ${qrExpired ? "border-gray-500" : "border-[#FF2DAA]"}`} />
                              
                              {!qrExpired && <div className="absolute left-0 right-0 h-0.5 bg-emerald-400 opacity-60 animate-bounce" />}
                              
                              <img
                                src={qrUrl}
                                alt="Scan to pay"
                                referrerPolicy="no-referrer"
                                className={`w-28 h-28 transition-all duration-300 ${qrExpired ? "opacity-10 blur-[1px] grayscale" : ""}`}
                              />

                              {qrExpired && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 bg-black/80 rounded-xl">
                                  <span className="text-[10px] font-mono text-red-400 font-bold uppercase">QR Expired</span>
                                  <button
                                    onClick={() => {
                                      setQrSecondsLeft(300);
                                      setQrExpired(false);
                                      setValidationError(null);
                                    }}
                                    className="mt-1.5 px-2.5 py-1 bg-red-900/40 hover:bg-red-900/60 text-white rounded text-[8px] font-mono font-bold transition-all cursor-pointer border border-red-500/20"
                                  >
                                    Regenerate QR
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-white block">
                                Scan with any UPI app to pay {currentPlanObj.price}
                              </span>
                              <span className="text-[9px] font-mono text-gray-400 block leading-tight max-w-[260px] mx-auto">
                                Point a second mobile device with a UPI scanner (GPay, PhonePe, Paytm) at this code. Do not close this screen.
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
                                className="w-full bg-gray-950 border border-gray-850 rounded-lg p-1.5 text-[11px] font-mono text-gray-200 focus:outline-none focus:border-[#FF2DAA] disabled:opacity-40 disabled:cursor-not-allowed"
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              )}
            </div>
 
            {/* Bottom Actions */}
            {!paymentSuccess && !paymentFailed && !isProcessingPayment && paymentSubStep === "idle" && (
              <div className="flex flex-col gap-2 pt-4">
                {validationError && (
                  <span className="text-[10px] font-mono text-red-400 block text-center bg-red-950/40 border border-red-500/20 p-2 rounded-xl">
                    {validationError}
                  </span>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep("recommendation")}
                    className="w-1/3 py-2.5 border border-gray-850 hover:bg-gray-900 rounded-xl font-display font-bold text-[10px] uppercase tracking-wider cursor-pointer text-gray-400"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => handleConfirmPayment(false)}
                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-[#00E5FF] hover:opacity-95 text-white rounded-xl font-display font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-98 transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirm Payment
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warning popup modal for choosing the Free Plan */}
      {showFreeWarning && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-xs bg-[#0E1121] border border-pink-500/30 rounded-2xl p-5 space-y-4 shadow-2xl relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-[2px] bg-gradient-to-r from-transparent via-[#FF2DAA] to-transparent" />
            
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-10 h-10 bg-pink-950/40 border border-pink-500/40 rounded-full flex items-center justify-center text-pink-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider">
                Missing Pro Features
              </h3>
              <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                You are about to choose the Free plan. Doing so means you will be missing advanced Zenith intelligence capabilities, including:
              </p>
            </div>

            {/* Missing perks list */}
            <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-850 text-left space-y-1.5 font-mono text-[9px] text-gray-400">
              <div className="flex items-center gap-1.5">
                <X className="w-3 h-3 text-pink-500 flex-shrink-0" />
                <span>Simultaneous 4-Model Council Mode</span>
              </div>
              <div className="flex items-center gap-1.5">
                <X className="w-3 h-3 text-pink-500 flex-shrink-0" />
                <span>3-Worker + Orchestrator Co-Model</span>
              </div>
              <div className="flex items-center gap-1.5">
                <X className="w-3 h-3 text-pink-500 flex-shrink-0" />
                <span>Smart File Analysis Mode (S-Mode)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <X className="w-3 h-3 text-pink-500 flex-shrink-0" />
                <span>Software Developer Terminal Workspace</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                disabled={freeCountdown > 0}
                onClick={() => {
                  setShowFreeWarning(false);
                  if (auth.currentUser) {
                    onComplete("free");
                  } else {
                    setSelectedTier("free");
                    setStep("auth");
                  }
                }}
                className="py-2 border border-gray-800 hover:bg-gray-900 text-gray-400 rounded-xl font-mono text-[10px] font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              >
                {freeCountdown > 0 ? (
                  <>
                    <Clock className="w-3 h-3 animate-spin text-pink-500" />
                    Free Plan ({freeCountdown}s)
                  </>
                ) : (
                  "Continue with Free"
                )}
              </button>
              <button
                onClick={() => {
                  setShowFreeWarning(false);
                  setSelectedTier("pro");
                  // Trigger direct auth or payment if logged in
                  if (auth.currentUser) {
                    setStep("payment");
                  } else {
                    setStep("auth");
                  }
                }}
                className="py-2 bg-gradient-to-r from-[#00E5FF] to-[#FF2DAA] hover:opacity-95 text-white rounded-xl font-mono text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
              >
                Get Pro
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gift Box Opening Animation Overlay */}
      <AnimatePresence>
        {showGiftBoxAnim && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#080A12]/95 backdrop-blur-md flex flex-col items-center justify-center z-[100] p-4 select-none"
          >
            {/* Confetti / Sparkle particles */}
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  backgroundColor: i % 3 === 0 ? "#FFD700" : i % 3 === 1 ? "#39FF14" : "#FF2DAA",
                  left: `${20 + Math.random() * 60}%`,
                  top: `${40 + Math.random() * 30}%`,
                }}
                animate={{
                  y: [-10, -120],
                  x: [0, (Math.random() - 0.5) * 60],
                  scale: [1, 0],
                  opacity: [1, 0],
                }}
                transition={{
                  duration: 2 + Math.random() * 1.5,
                  repeat: Infinity,
                  delay: Math.random() * 0.5,
                }}
              />
            ))}

            <motion.div
              initial={{ scale: 0.6, y: 100 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 15 }}
              className="relative flex flex-col items-center text-center space-y-6 animate-pulse"
            >
              {/* Lid of the gift box */}
              <motion.div
                animate={{ y: [0, -150], rotate: [0, -45], opacity: [1, 0] }}
                transition={{ duration: 1.8, delay: 0.6, ease: "easeOut" }}
                className="w-24 h-6 bg-gradient-to-r from-[#FF2DAA] to-pink-600 rounded-t-lg border-b border-pink-400 shadow-xl z-20"
              />
              {/* Box bottom */}
              <motion.div
                animate={{ y: [0, 15], scale: [1, 0.95] }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="w-24 h-20 bg-gradient-to-b from-[#FF2DAA] to-pink-700 rounded-b-lg shadow-2xl relative flex items-center justify-center z-10"
              >
                {/* Yellow ribbon cross */}
                <div className="absolute inset-y-0 left-10 w-4 bg-yellow-400" />
                <div className="absolute inset-x-0 top-8 h-4 bg-yellow-400" />
              </motion.div>

              {/* Floating prize text "Pro Plan for FREE" */}
              <motion.div
                initial={{ y: 30, scale: 0.1, opacity: 0 }}
                animate={{ y: -200, scale: 1.4, opacity: 1 }}
                transition={{ type: "spring", stiffness: 100, damping: 12, delay: 0.9 }}
                className="absolute flex flex-col items-center pointer-events-none"
              >
                <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 text-black font-display font-black text-xs px-5 py-2.5 rounded-2xl shadow-[0_0_40px_rgba(250,204,21,0.6)] border-2 border-white flex items-center gap-1.5 whitespace-nowrap">
                  <Sparkles className="w-4 h-4 text-black animate-spin" />
                  Pro Plan for FREE!
                </div>
                <span className="text-[9px] font-mono text-yellow-300 mt-2 uppercase tracking-widest bg-black/80 px-2.5 py-1 rounded-full border border-yellow-400/20">
                  First Month 100% Off Applied
                </span>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
