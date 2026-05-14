import React, { useState, useEffect, useRef } from "react";
import { auth, db, logout } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  getDocFromServer,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Plus,
  MessageCircle,
  LogOut,
  User as UserIcon,
  Home,
  Tag,
  MapPin,
  Shield,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  Share2,
  Sun,
  Moon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

// Pages
import HomePage from "./pages/HomePage";
import ListingDetailsPage from "./pages/ListingDetailsPage";
import CreateListingPage from "./pages/CreateListingPage";
import ChatListPage from "./pages/ChatListPage";
import ChatRoomPage from "./pages/ChatRoomPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import EditListingPage from "./pages/EditListingPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import SupportButton from "./components/SupportButton";
import MobileNav from "./components/MobileNav";
import ReferralModal from "./components/ReferralModal";
import VoiceCall from "./components/VoiceCall";

interface GlobalCallState {
  chatId: string;
  targetId: string;
  targetName: string;
  isCaller: boolean;
  callId?: string;
}

export const CallContext = React.createContext<{
  activeCall: GlobalCallState | null;
  isMinimized: boolean;
  initiateCall: (chatId: string, targetId: string, targetName: string) => void;
  setCallMinimized: (min: boolean) => void;
  endCall: () => void;
} | null>(null);

export default function App() {
  const [activeCall, setActiveCall] = useState<GlobalCallState | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const initiateCall = (
    chatId: string,
    targetId: string,
    targetName: string,
  ) => {
    setActiveCall({ chatId, targetId, targetName, isCaller: true });
    setIsMinimized(false);
  };

  const initiateIncoming = (
    chatId: string,
    targetId: string,
    targetName: string,
    callId: string,
  ) => {
    setActiveCall({ chatId, targetId, targetName, isCaller: false, callId });
    setIsMinimized(false);
  };

  const endCall = () => {
    setActiveCall(null);
    setIsMinimized(false);
  };

  return (
    <Router>
      <CallContext.Provider
        value={
          {
            activeCall,
            isMinimized,
            initiateCall,
            endCall,
            setCallMinimized: setIsMinimized,
            // Internal helper for incoming
            _initiateIncoming: initiateIncoming,
          } as any
        }
      >
        <AppContent />
      </CallContext.Provider>
    </Router>
  );
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const {
    activeCall,
    isMinimized,
    endCall,
    setCallMinimized,
    _initiateIncoming,
  } = React.useContext(CallContext) as any;
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  const [theme, setTheme] = useState<"light" | "dark">(
    (localStorage.getItem("theme") as "light" | "dark") || "light",
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  useEffect(() => {
    if (!user || activeCall) return;

    const q = query(
      collection(db, "calls"),
      where("receiverId", "==", user.uid),
      where("status", "==", "ringing"),
      limit(1),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty && !activeCall) {
        const d = snapshot.docs[0];
        const data = d.data();

        // Ignore calls older than 60 seconds to prevent zombie calls from ringing
        const callTime = data.createdAt?.toMillis
          ? data.createdAt.toMillis()
          : Date.now();
        if (Date.now() - callTime > 60000) {
          return;
        }

        _initiateIncoming(data.chatId, data.callerId, data.callerName, d.id);
      }
    });
    return () => unsubscribe();
  }, [user, activeCall, _initiateIncoming]);

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    const setOnline = () => {
      setDoc(
        userRef,
        {
          isOnline: true,
          lastActive: serverTimestamp(),
        },
        { merge: true },
      ).catch((err) => console.error("Error setting online:", err));
    };

    const setOffline = () => {
      if (!auth.currentUser) return;
      setDoc(
        userRef,
        {
          isOnline: false,
          lastActive: serverTimestamp(),
        },
        { merge: true },
      ).catch((err) => {
        if (
          err.message &&
          err.message.includes("Missing or insufficient permissions")
        ) {
          // Ignore, this happens during logout when token is destroyed
          return;
        }
        console.error("Error setting offline:", err);
      });
    };

    setOnline();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setOnline();
      } else {
        setOffline();
      }
    };

    window.addEventListener("beforeunload", setOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      setOffline();
      window.removeEventListener("beforeunload", setOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user]);

  useEffect(() => {
    // Test Firestore Connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, "_connection_test_", "check"));
      } catch (error: any) {
        if (error.message?.includes("the client is offline")) {
          console.error(
            "Firebase connection error: The client is offline. Please check your Firebase configuration.",
          );
        }
      }
    };
    testConnection();

    let userDocUnsubscribe: () => void;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
      }

      if (user) {
        // Sync user to Firestore
        const userRef = doc(db, "users", user.uid);

        userDocUnsubscribe = onSnapshot(userRef, async (userSnap) => {
          if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.isBanned) {
              alert("Your account has been banned.");
              await auth.signOut();
            }
          }
        });

        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          const referralCode = Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();
          await setDoc(userRef, {
            uid: user.uid,
            displayName: user.displayName || "User",
            email: user.email,
            photoURL: user.photoURL || "",
            referralCode: referralCode,
            createdAt: serverTimestamp(),
            role: "user",
          });
        } else {
          // Sync profile info if it changed
          const existingData = userSnap.data();
          const needsSync =
            existingData.displayName !== user.displayName ||
            (!existingData.photoURL && user.photoURL);

          if (needsSync) {
            await setDoc(
              userRef,
              {
                displayName: user.displayName || existingData.displayName,
                photoURL: existingData.photoURL || user.photoURL || "",
              },
              { merge: true },
            );
          }
        }
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background transition-colors">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full shadow-2xl shadow-primary/20"
        />
      </div>
    );
  }

  const isAdminRoute =
    location.pathname.startsWith("/admin") &&
    !location.pathname.startsWith("/admin-login");
  const isAdminLoginRoute = location.pathname.startsWith("/admin-login");
  const isChatRoom = location.pathname.startsWith("/chat/");

  const isProtectedRoute =
    location.pathname.startsWith("/profile") ||
    location.pathname.startsWith("/create") ||
    location.pathname.startsWith("/edit-listing") ||
    location.pathname.startsWith("/chats") ||
    isChatRoom;

  if (isAdminLoginRoute) {
    return (
      <Routes>
        <Route path="/admin-login" element={<AdminLoginPage />} />
      </Routes>
    );
  }

  if (isAdminRoute) {
    return (
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    );
  }

  if (isProtectedRoute && !user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-300">
      {!isChatRoom && location.pathname !== "/login" && (
        <Navbar user={user as any} theme={theme} toggleTheme={toggleTheme} />
      )}
      <main
        className={cn(
          "flex-1 w-full max-w-none md:container md:mx-auto px-4 md:px-6 py-4 md:py-8",
          isChatRoom && "py-0 md:py-4",
        )}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/profile" replace />} />
          <Route path="/listing/:id" element={<ListingDetailsPage />} />
          <Route path="/edit-listing/:id" element={<EditListingPage />} />
          <Route path="/create" element={<CreateListingPage />} />
          <Route path="/chats" element={<ChatListPage />} />
          <Route path="/chat/:id" element={<ChatRoomPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />
        </Routes>
      </main>
      {isHomePage && <SupportButton />}
      {!isChatRoom && location.pathname !== "/login" && <MobileNav />}
      {activeCall && (
        <VoiceCall
          chatId={activeCall.chatId}
          targetId={activeCall.targetId}
          targetName={activeCall.targetName}
          isCaller={activeCall.isCaller}
          onClose={endCall}
          callId={activeCall.callId}
          isMinimized={isMinimized}
          onMinimize={() => setCallMinimized(!isMinimized)}
        />
      )}
    </div>
  );
}

function Navbar({
  user,
  theme,
  toggleTheme,
}: {
  user: User;
  theme: "light" | "dark";
  toggleTheme: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [brandSettings, setBrandSettings] = useState<{
    siteTitle?: string;
    logoUrl?: string;
  }>({});

  useEffect(() => {
    const unsubBrand = onSnapshot(doc(db, "settings", "global"), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setBrandSettings(data);
        if (data.siteTitle) {
          document.title = data.siteTitle;
        }
      }
    });
    return () => unsubBrand();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data());
      }
    });
    return () => unsubscribe();
  }, [user]);

  const recognitionRef = useRef<any>(null);

  const startVoiceSearch = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search is not supported in your browser.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      navigate(`/?q=${encodeURIComponent(transcript)}`);
      setShowMobileSearch(false);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      const error = event.error?.toString().toLowerCase().trim() || "";
      if (!error.includes("abort") && !error.includes("no-speech")) {
        console.error("Speech recognition error:", error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("Error starting recognition:", err);
      setIsListening(false);
    }
  };

  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        if (user.email === "sachinraghav9090@gmail.com") {
          setIsAdmin(true);
        } else {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && userDoc.data().role === "admin") {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        }
      } else {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/");
    }
  };

  return (
    <nav className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
      <div className="w-full md:container md:mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-1 rounded-lg group-hover:opacity-90 transition-opacity">
              {brandSettings.logoUrl ? (
                <img
                  src={brandSettings.logoUrl}
                  alt="Logo"
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <div className="bg-blue-600 p-1.5 rounded-lg group-hover:bg-blue-700 transition-colors">
                  <Tag className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {brandSettings.siteTitle || (
                <>
                  Local<span className="text-blue-600">Trade</span>
                </>
              )}
            </span>
          </Link>
        </div>

        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <form onSubmit={handleSearch} className="relative w-full group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search for cars, phones and more..."
              className="pl-10 pr-10 bg-slate-100 dark:bg-slate-900 border-none focus-visible:ring-blue-500 dark:text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="button"
              onClick={startVoiceSearch}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors",
                isListening
                  ? "text-red-500 bg-red-50"
                  : "text-slate-400 hover:text-blue-600 hover:bg-blue-50",
              )}
            >
              {isListening ? (
                <MicOff className="w-4 h-4 animate-pulse" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === "light" ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-slate-600 dark:text-slate-300"
            onClick={() => setShowMobileSearch(!showMobileSearch)}
          >
            <Search className="w-5 h-5" />
          </Button>

          {isAdmin && (
            <Link to="/admin">
              <Button
                variant="ghost"
                size="icon"
                className="relative text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Shield className="w-5 h-5" />
              </Button>
            </Link>
          )}
          {isHomePage && <ReferralModal />}
          <Link to="/chats" className="hidden md:block">
            <Button variant="ghost" size="icon" className="relative">
              <MessageCircle className="w-5 h-5" />
            </Button>
          </Link>
          <Link to="/create" className="hidden md:block">
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2 px-3 sm:px-4">
              <Plus className="w-4 h-4" />
              <span className="hidden xs:inline">Sell</span>
            </Button>
          </Link>
          {user ? (
            <Link to="/profile" className="hidden md:block">
              <Avatar className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all">
                <AvatarImage
                  src={
                    userProfile?.photoURL && userProfile.photoURL !== "none"
                      ? userProfile.photoURL
                      : userProfile?.photoURL === "none"
                        ? undefined
                        : user?.photoURL || undefined
                  }
                />
                <AvatarFallback>
                  {(userProfile?.displayName || user?.displayName || "U")[0]}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Link to="/login" className="hidden md:block">
              <Button variant="outline" size="sm" className="ml-2">
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Search Bar */}
      <AnimatePresence>
        {showMobileSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden"
          >
            <div className="p-4">
              <form
                onSubmit={(e) => {
                  handleSearch(e);
                  setShowMobileSearch(false);
                }}
                className="relative w-full"
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  autoFocus
                  placeholder="Search for items..."
                  className="pl-10 pr-10 bg-slate-100 dark:bg-slate-900 border-none focus-visible:ring-blue-500 dark:text-white w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="button"
                  onClick={startVoiceSearch}
                  className={cn(
                    "absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors",
                    isListening
                      ? "text-red-500 bg-red-50"
                      : "text-slate-400 hover:text-blue-600 hover:bg-blue-50",
                  )}
                >
                  {isListening ? (
                    <MicOff className="w-4 h-4 animate-pulse" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

// LoginPrompt removed as app is now gated
