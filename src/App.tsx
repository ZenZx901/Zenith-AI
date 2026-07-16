import React, { useState, useEffect } from "react";
import {
  AIModel,
  APPROVED_MODELS,
  ChatMessage,
  ChatSession,
  UsagePools,
  PricingTier,
  TIER_LIMITS,
} from "./types.js";
import OnboardingFlow from "./components/OnboardingFlow.tsx";
import ChatWorkspace from "./components/ChatWorkspace.tsx";
import DashboardStats from "./components/DashboardStats.tsx";
import ModelsList from "./components/ModelsList.tsx";
import SettingsModal from "./components/SettingsModal.tsx";
import { MessageSquare, Layers, Cpu, LogOut, Plus, Trash2, Sliders, Menu, X, ShieldAlert, Cpu as CpuIcon, Settings, Sun, Moon, Laptop } from "lucide-react";
import { auth } from "./lib/firebase.js";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { getUserProfile, saveUserProfile, getUserSessions, saveUserSession, deleteUserSession } from "./lib/firebaseSync.js";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [appState, setAppState] = useState<"loading" | "auth" | "onboarding" | "dashboard">("loading");
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentTier, setCurrentTier] = useState<PricingTier>("pro");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "dashboard" | "models">("chat");
  const [isDevMode, setIsDevMode] = useState(false);
  const [showSessionsDrawer, setShowSessionsDrawer] = useState(false);
  
  // Settings & Theme states
  const [theme, setTheme] = useState<"dark" | "light" | "system">(() => {
    return (localStorage.getItem("zenith-theme") as "dark" | "light" | "system") || "dark";
  });
  const [simplifyInterface, setSimplifyInterface] = useState<boolean>(() => {
    return localStorage.getItem("zenith-simplify") === "true";
  });
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(() => {
    return localStorage.getItem("zenith-api-base-url") || "";
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Sync settings to localStorage
  useEffect(() => {
    localStorage.setItem("zenith-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("zenith-simplify", simplifyInterface ? "true" : "false");
  }, [simplifyInterface]);

  useEffect(() => {
    localStorage.setItem("zenith-api-base-url", apiBaseUrl);
  }, [apiBaseUrl]);

  // Universal rolling 5-hour window usage state
  const [usage, setUsage] = useState<UsagePools>({
    poolA: { used: 0, limit: TIER_LIMITS.pro.poolA },
    poolB: { used: 0, limit: TIER_LIMITS.pro.poolB },
    poolC: { used: 0, limit: TIER_LIMITS.pro.poolC },
    windowStart: new Date().toISOString(),
    windowEnd: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
  });

  const [countdownSeconds, setCountdownSeconds] = useState(5 * 60 * 60);

  // Chat sessions
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const id = `session-${crypto.randomUUID()}`;
    return [{
      id,
      name: "Product Brainstorming",
      mode: "normal",
      messages: [],
      selectedModels: ["claude-sonnet-4-6"],
    }];
  });
  const [activeSessionId, setActiveSessionId] = useState(() => sessions[0].id);

  // Firebase Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        setIsAuthLoading(true);
        try {
          // 1. Fetch user profile
          let profile = await getUserProfile(user.uid);
          
          if (!profile) {
            // New user, needs onboarding
            setAppState("onboarding");
            // ... (Initialize default profile/session logic)
            // Need to still set some defaults
          } else {
            // Existing user
            setUserProfile(profile);
            setCurrentTier(profile.currentTier);
            setAppState("dashboard");
            
            // ... (Initialize session logic)
            const userSessions = await getUserSessions(user.uid);
            if (userSessions && userSessions.length > 0) {
              setSessions(userSessions);
              setActiveSessionId(userSessions[0].id);
            }
          }

          setIsAuthenticated(true);
        } catch (err) {
          console.error("Error setting up user workspace after auth change:", err);
        } finally {
          setIsAuthLoading(false);
        }
      } else {
        // Logged out
        setAppState("auth");
        setIsAuthenticated(false);
        const newId = `session-${crypto.randomUUID()}`;
        setSessions([
          {
            id: newId,
            name: "Product Brainstorming",
            mode: "normal",
            messages: [],
            selectedModels: ["claude-sonnet-4-6"],
          },
        ]);
        setActiveSessionId(newId);
        setCurrentTier("pro");
        setUserProfile(null);
        setIsAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Synchronize limits when current tier changes (only if logged in & profile needs updating)
  useEffect(() => {
    if (!firebaseUser) return;
    const lim = TIER_LIMITS[currentTier];
    setUsage((prev) => {
      const updated = {
        ...prev,
        poolA: { ...prev.poolA, limit: lim.poolA },
        poolB: { ...prev.poolB, limit: lim.poolB },
        poolC: { ...prev.poolC, limit: lim.poolC },
      };
      setTimeout(() => {
        saveUserProfile(firebaseUser.uid!, { usagePools: updated, currentTier }).catch((err) => {
          console.error("Error saving user profile on tier sync:", err);
        });
      }, 0);
      return updated;
    });
  }, [currentTier, firebaseUser]);

  // Countdown clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          // Trigger complete quota reset!
          handleResetUsage();
          return 5 * 60 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [firebaseUser]);

  const handleResetUsage = async () => {
    const reset = {
      poolA: { ...usage.poolA, used: 0 },
      poolB: { ...usage.poolB, used: 0 },
      poolC: { ...usage.poolC, used: 0 },
      windowStart: new Date().toISOString(),
      windowEnd: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    };
    setUsage(reset);
    setCountdownSeconds(5 * 60 * 60);

    if (firebaseUser) {
      await saveUserProfile(firebaseUser.uid, { usagePools: reset });
    }
  };

  const handleUsageUpdate = async (pool: "poolA" | "poolB" | "poolC", tokens: number) => {
    setUsage((prev) => {
      const updated = {
        ...prev,
        [pool]: { ...prev[pool], used: prev[pool].used + tokens },
      };
      if (firebaseUser) {
        setTimeout(() => {
          saveUserProfile(firebaseUser.uid!, { usagePools: updated }).catch((err) => {
            console.error("Error saving usage update:", err);
          });
        }, 0);
      }
      return updated;
    });
  };

  const handleBuyTokens = async (pool: "poolA" | "poolB" | "poolC", amount: number, price: string) => {
    // Adds to the limit permanently representing standard in-app simulated credit purchases
    setUsage((prev) => {
      const updated = {
        ...prev,
        [pool]: { ...prev[pool], limit: prev[pool].limit + amount },
      };
      if (firebaseUser) {
        setTimeout(() => {
          saveUserProfile(firebaseUser.uid!, { usagePools: updated }).catch((err) => {
            console.error("Error saving buy tokens update:", err);
          });
        }, 0);
      }
      return updated;
    });
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  const handleUpdateSession = async (updated: ChatSession) => {
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    if (firebaseUser) {
      await saveUserSession(firebaseUser.uid, updated);
    }
  };

  const handleCreateSession = async (mode: "normal" | "council" | "comodel" | "dev" | "smode" | "supercouncil") => {
    const newSession: ChatSession = {
      id: "session-" + Math.random().toString(36).substring(7),
      name: `${mode.toUpperCase()} Session #${sessions.length + 1}`,
      mode,
      messages: [],
      selectedModels: mode === "council" ? ["claude-opus-4-6", "gpt-5-1-codex-max", "gemini-3-1", "deepseek-r1"] : ["claude-sonnet-4-6"],
    };
    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(newSession.id);
    setActiveTab("chat");
    setShowSessionsDrawer(false);
    if (firebaseUser) {
      await saveUserSession(firebaseUser.uid, newSession);
    }
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) return;
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (activeSessionId === id) {
      setActiveSessionId(remaining[0].id);
    }
    if (firebaseUser) {
      await deleteUserSession(id);
    }
  };

  const handleDeleteSessionDirect = async (id: string) => {
    if (sessions.length <= 1) return;
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (activeSessionId === id) {
      setActiveSessionId(remaining[0].id);
    }
    if (firebaseUser) {
      await deleteUserSession(id);
    }
  };

  // Manage automatic permanent marking when returning to an old session
  useEffect(() => {
    if (!firebaseUser) return;
    const session = sessions.find((s) => s.id === activeSessionId);
    if (!session) return;

    const now = new Date().toISOString();
    const createdStr = session.createdAt || now;
    const isPastDay = (() => {
      const createdDate = new Date(createdStr);
      const today = new Date();
      const createdMidnight = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate()).getTime();
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      return createdMidnight < todayMidnight;
    })();

    let needsUpdate = false;
    const updatedSession = { ...session };

    // Rule: if returned to a chat done days ago, store permanently
    if (isPastDay && !session.isPermanent) {
      updatedSession.isPermanent = true;
      needsUpdate = true;
    }

    // Update last accessed time if it's been more than 1 minute since last access
    const lastAccessedTime = session.lastAccessedAt ? new Date(session.lastAccessedAt).getTime() : 0;
    if (Date.now() - lastAccessedTime > 60 * 1000) {
      updatedSession.lastAccessedAt = now;
      needsUpdate = true;
    }

    if (needsUpdate) {
      handleUpdateSession(updatedSession);
    }
  }, [activeSessionId, firebaseUser]);

  const handleBackClick = () => {
    // Android virtual Back Button emulation: moves tabs sequentially back
    if (activeTab === "models") setActiveTab("dashboard");
    else if (activeTab === "dashboard") setActiveTab("chat");
    else if (showSessionsDrawer) setShowSessionsDrawer(false);
  };

  const handleHomeClick = async () => {
    // Android virtual Home Button emulation: logs out of Firebase
    await signOut(auth);
  };

  const handleRecentsClick = () => {
    // Android virtual Recents Button emulation: Toggles session lists drawer!
    setShowSessionsDrawer((prev) => !prev);
  };

  const handleOnboardingComplete = async (selectedTier: PricingTier) => {
    const user = auth.currentUser;
    if (user) {
      const initialUsage = {
        poolA: { used: 0, limit: TIER_LIMITS[selectedTier].poolA },
        poolB: { used: 0, limit: TIER_LIMITS[selectedTier].poolB },
        poolC: { used: 0, limit: TIER_LIMITS[selectedTier].poolC },
        windowStart: new Date().toISOString(),
        windowEnd: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
      };

      const profileData = {
        email: user.email || localStorage.getItem("zenith-auth-email") || "",
        displayName: user.displayName || (user.email || localStorage.getItem("zenith-auth-email") || "user").split("@")[0] || "User",
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
        currentTier: selectedTier,
        usagePools: initialUsage,
        createdAt: new Date().toISOString(),
        customInstructionsAboutMe: "",
        customInstructionsResponseStyle: "",
        defaultTemperature: 0.7,
        defaultModel: "claude-sonnet-4-6",
        defaultMaxTokens: 4096
      };

      // Create profile in Firestore
      await saveUserProfile(user.uid, profileData);

      // Create a default session
      const defaultSession: ChatSession = {
        id: "session-" + Math.random().toString(36).substring(7),
        name: "Product Brainstorming",
        mode: "normal",
        messages: [],
        selectedModels: ["claude-sonnet-4-6"],
      };

      await saveUserSession(user.uid, defaultSession);

      setUserProfile(profileData);
      setSessions([defaultSession]);
      setActiveSessionId(defaultSession.id);
      setCurrentTier(selectedTier);
      setUsage(initialUsage);
      setIsAuthenticated(true);
      setAppState("dashboard");
      
      // Send welcome mail
      try {
        const baseUrl = apiBaseUrl || "http://localhost:3000";
        fetch(`${baseUrl}/api/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: profileData.email,
            subject: "Welcome to Zenith AI",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #00E5FF;">Welcome to Zenith AI</h1>
                <p>Hello ${profileData.displayName},</p>
                <p>Thanks for joining Zenith AI workspace. Explore 34 models and 6 advanced reasoning modes.</p>
                <br />
                <p>Enjoy your newly acquired tier limits.</p>
                <br />
                <p>Best,<br/>The Zenith Team</p>
              </div>
            `
          })
        });
      } catch (e) {
        console.error("Failed to trigger welcome email");
      }
    }
  };

  const handleUpdateProfile = async (updates: any) => {
    if (!firebaseUser) return;
    try {
      const merged = { ...userProfile, ...updates };
      setUserProfile(merged);
      await saveUserProfile(firebaseUser.uid, updates);
    } catch (err) {
      console.error("Error updating user profile:", err);
    }
  };

  const handleClearSessions = async () => {
    if (!firebaseUser) return;
    try {
      const defaultSession: ChatSession = {
        id: "session-" + Math.random().toString(36).substring(7),
        name: "Initial Brainstorming",
        mode: "normal",
        messages: [],
        selectedModels: ["claude-sonnet-4-6"],
      };

      for (const s of sessions) {
        try {
          await deleteUserSession(s.id);
        } catch (err) {
          console.error("Error deleting session:", s.id, err);
        }
      }

      await saveUserSession(firebaseUser.uid, defaultSession);

      setSessions([defaultSession]);
      setActiveSessionId(defaultSession.id);
      setActiveTab("chat");
    } catch (err) {
      console.error("Error wiping sessions:", err);
    }
  };

  if (isAuthLoading || appState === "loading") {
    return (
      <div className="flex-1 flex flex-col justify-center items-center h-screen bg-[#0B0D17] text-white space-y-4">
        <div className="relative">
          <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-[#00E5FF] to-[#FF2DAA] opacity-75 blur animate-pulse" />
          <div className="relative w-14 h-14 bg-gray-950 rounded-full flex items-center justify-center border border-gray-800">
            <CpuIcon className="w-6 h-6 text-[#00E5FF] animate-spin" />
          </div>
        </div>
        <span className="font-mono text-xs text-gray-400 tracking-wider">SYNCING ZENITH WORKSPACE PROFILE...</span>
      </div>
    );
  }

  const isLight = theme === "light" || (theme === "system" && window.matchMedia("(prefers-color-scheme: light)").matches);

  if (appState === "auth") {
    return (
      <div className={`flex-1 flex flex-col h-screen overflow-hidden relative ${isLight ? "theme-light bg-[#F9FAFB] text-gray-900" : "bg-[#080A12] text-white"}`}>
        {/* Reuse the onboarding flow, but we might need a prop to just show auth */}
        <OnboardingFlow onComplete={handleOnboardingComplete} initialStep="auth" />
      </div>
    );
  }
  
  if (appState === "onboarding") {
    return (
      <div className={`flex-1 flex flex-col h-screen overflow-hidden relative ${isLight ? "theme-light bg-[#F9FAFB] text-gray-900" : "bg-[#080A12] text-white"}`}>
        <OnboardingFlow onComplete={handleOnboardingComplete} initialStep="cinematic" />
      </div>
    );
  }

  // Dashboard / AppShell
  return (
    <div className={`flex-1 flex flex-col h-screen overflow-hidden relative ${isLight ? "theme-light bg-[#F9FAFB] text-gray-900" : "bg-[#080A12] text-white"}`}>
      
      {/* Header bar */}
        <div className="h-12 bg-[#0E1121] px-3 border-b border-gray-850 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSessionsDrawer((prev) => !prev)}
              title="Toggle Menu"
              className="md:hidden p-1.5 rounded-lg bg-gray-950 hover:text-[#00E5FF] transition-colors cursor-pointer text-gray-400 border border-gray-800"
            >
              {showSessionsDrawer ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
            </button>
            <span className="font-display font-bold text-sm tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] to-[#FF2DAA]">
              ZENITH AI
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-pink-950/40 text-pink-400 border border-pink-500/30 uppercase tracking-widest">
              {currentTier}
            </span>
            <button
              onClick={() => setShowSettingsModal(true)}
              title="App Settings"
              className="p-1.5 rounded-lg bg-gray-900 hover:text-[#00E5FF] transition-colors cursor-pointer text-gray-400"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleHomeClick}
              title="Sign Out"
              className="p-1.5 rounded-lg bg-gray-900 hover:text-red-400 transition-colors cursor-pointer text-gray-400"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Main Workspace Layout */}
        <div className="flex-1 flex overflow-hidden relative">

          {/* Backdrop Overlay for mobile slide-out drawer */}
          {showSessionsDrawer && (
            <div
              className="absolute inset-0 bg-black/70 z-20 md:hidden cursor-pointer backdrop-blur-xs transition-opacity duration-300"
              onClick={() => setShowSessionsDrawer(false)}
            />
          )}

          {/* Static Sidebar for Desktop mode / Absolute Drawer for Phone frame */}
          <div className={`
            absolute md:relative top-0 bottom-0 left-0 h-full w-[260px] md:w-[240px] 
            z-30 md:z-auto flex flex-col bg-[#0E1121] border-r border-gray-850 transition-transform duration-300 ease-in-out flex-shrink-0
            ${showSessionsDrawer ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}>
              <div className="p-3 bg-[#11152B] border-b border-gray-800 flex items-center justify-between flex-shrink-0">
                <span className="text-xs font-mono font-bold text-[#00E5FF]">CHANNELS & THREADS</span>
                <button
                  onClick={() => setShowSessionsDrawer(false)}
                  className="md:hidden p-1 hover:text-red-400 text-gray-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sidebar Navigation Section */}
              <div className="p-3 border-b border-gray-850 flex flex-col gap-1.5 bg-[#11152B]/30 select-none flex-shrink-0">
                <span className="text-[10px] font-mono text-gray-500 block uppercase">WORKSPACE TABS</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setActiveTab("chat");
                      setShowSessionsDrawer(false); // Close mobile drawer
                    }}
                    className={`py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                      activeTab === "chat"
                        ? "bg-[#00E5FF]/10 border-[#00E5FF]/40 text-[#00E5FF]"
                        : "bg-gray-950 border-gray-850 text-gray-400 hover:text-white"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-[9px] font-mono uppercase font-bold tracking-wider">Chat</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setActiveTab("dashboard");
                      setShowSessionsDrawer(false); // Close mobile drawer
                    }}
                    className={`py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                      activeTab === "dashboard"
                        ? "bg-[#FF2DAA]/10 border-[#FF2DAA]/40 text-[#FF2DAA]"
                        : "bg-gray-950 border-gray-850 text-gray-400 hover:text-white"
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span className="text-[9px] font-mono uppercase font-bold tracking-wider">Dashboard</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setActiveTab("models");
                      setShowSessionsDrawer(false); // Close mobile drawer
                    }}
                    className={`py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                      activeTab === "models"
                        ? "bg-purple-500/10 border-purple-500/40 text-purple-400"
                        : "bg-gray-950 border-gray-850 text-gray-400 hover:text-white"
                    }`}
                  >
                    <Cpu className="w-4 h-4" />
                    <span className="text-[9px] font-mono uppercase font-bold tracking-wider">Models</span>
                  </motion.button>
                </div>
              </div>

              <div className="p-3 border-b border-gray-850 space-y-1.5 flex-shrink-0">
                <span className="text-[10px] font-mono text-gray-500 block uppercase">Create Thread in Mode:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "normal", label: "Normal" },
                    { id: "council", label: "Council" },
                    { id: "comodel", label: "Co-Model" },
                    { id: "dev", label: "Dev" },
                    { id: "smode", label: "S-Mode" },
                    { id: "supercouncil", label: "Super Council" },
                  ].map((mode) => (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      key={mode.id}
                      onClick={() => handleCreateSession(mode.id as any)}
                      className="py-1 text-[10px] font-mono border border-gray-800 rounded bg-gray-950 hover:border-[#00E5FF]/40 text-gray-300 transition-colors cursor-pointer capitalize"
                    >
                      + {mode.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Session Threads list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {sessions.map((s) => {
                  const isActive = s.id === activeSessionId;
                  return (
                    <motion.div
                      whileHover={{ x: 4 }}
                      key={s.id}
                      onClick={() => {
                        setActiveSessionId(s.id);
                        setActiveTab("chat");
                        setShowSessionsDrawer(false); // Close mobile drawer
                      }}
                      className={`p-2 rounded-lg flex items-center justify-between cursor-pointer group transition-all ${
                        isActive
                          ? "bg-[#161B3B] border border-[#00E5FF]/30 text-[#00E5FF]"
                          : "hover:bg-gray-900 text-gray-400 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                        <div className="truncate text-left">
                          <span className="text-xs font-semibold block truncate leading-none mb-0.5">{s.name}</span>
                          <span className="text-[9px] font-mono text-gray-500 capitalize">{s.mode} mode</span>
                        </div>
                      </div>
                      {sessions.length > 1 && (
                        <button
                          onClick={(e) => handleDeleteSession(s.id, e)}
                          className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
          </div>

          {/* Tab content renderer */}
          <div className="flex-1 overflow-hidden flex">
            {activeTab === "chat" && (
              <ChatWorkspace
                key={activeSession.id}
                usage={usage}
                onUsageUpdate={handleUsageUpdate}
                isDevMode={isDevMode}
                setIsDevMode={setIsDevMode}
                activeSession={activeSession}
                onUpdateSession={handleUpdateSession}
                currentTier={currentTier}
                userProfile={userProfile}
                isPhoneFrame={false}
                apiBaseUrl={apiBaseUrl}
              />
            )}

            {activeTab === "dashboard" && (
              <DashboardStats
                currentTier={currentTier}
                onTierChange={setCurrentTier}
                usage={usage}
                onBuyTokens={handleBuyTokens}
                onResetUsage={handleResetUsage}
                countdownSeconds={countdownSeconds}
                sessions={sessions}
                onSelectSession={(id) => {
                  setActiveSessionId(id);
                  setActiveTab("chat");
                }}
                onDeleteSessionDirect={handleDeleteSessionDirect}
                onUpdateSession={handleUpdateSession}
              />
            )}

            {activeTab === "models" && (
              <ModelsList
                onSelectModel={(id) => {
                  // Instantly update active thread's model if normal
                  if (activeSession.mode === "normal") {
                    handleUpdateSession({
                      ...activeSession,
                      selectedModels: [id],
                    });
                  }
                  setActiveTab("chat");
                }}
              />
            )}
          </div>

        </div>

        {/* Settings Modal Overlay */}
        {showSettingsModal && (
          <SettingsModal
            onClose={() => setShowSettingsModal(false)}
            currentTier={currentTier}
            onTierChange={setCurrentTier}
            usage={usage}
            sessions={sessions}
            onClearSessions={handleClearSessions}
            userProfile={userProfile}
            onUpdateProfile={handleUpdateProfile}
            theme={theme}
            setTheme={setTheme}
            simplifyInterface={simplifyInterface}
            setSimplifyInterface={setSimplifyInterface}
            apiBaseUrl={apiBaseUrl}
            setApiBaseUrl={setApiBaseUrl}
          />
        )}

      </div>
  );
}
