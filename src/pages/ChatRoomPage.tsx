import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { Chat, Message, UserProfile } from "../types";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Send,
  ChevronLeft,
  Info,
  MoreVertical,
  Trash2,
  PackageX,
  AlertTriangle,
  Phone,
  Mic,
  Image as ImageIcon,
  Video,
  MapPin,
  Activity,
  Paperclip,
  X,
  Navigation,
  Tag,
  HandCoins,
  Check,
  Ban,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { CallContext } from "../App";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { uploadImage } from "../services/uploadService";
import AdMobBanner from "../components/AdMobBanner";

// Fix leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Helper component to handle map clicks
function LocationMapPicker({
  onSelect,
}: {
  onSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Speech Recognition Types
interface SpeechRecognitionEvent extends Event {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

export default function ChatRoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { initiateCall } = React.useContext(CallContext) as any;
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteListingConfirm, setShowDeleteListingConfirm] =
    useState(false);
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showLiveLocationDialog, setShowLiveLocationDialog] = useState(false);
  const [liveDuration, setLiveDuration] = useState<number>(15);
  const [pickedLocation, setPickedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 20.5937,
    lng: 78.9629,
  });
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const trackingIntervalRef = useRef<any>(null);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePressStart = (msg: Message) => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      setSelectedMessage(msg);
    }, 2000);
  };

  const handlePressEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };
  const trackingMsgId = useRef<string | null>(null);

  const sendOffer = async () => {
    if (!id || !auth.currentUser || !offerPrice) return;

    try {
      await addDoc(collection(db, "chats", id, "messages"), {
        chatId: id,
        senderId: auth.currentUser.uid,
        type: "offer",
        text: `Offered ₹${offerPrice}`,
        offerDetails: {
          price: parseFloat(offerPrice),
          status: "pending",
        },
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "chats", id), {
        lastMessage: `Offer: ₹${offerPrice}`,
        lastMessageAt: serverTimestamp(),
      });

      setOfferPrice("");
      setShowOfferDialog(false);
      setShowAttachments(false);
    } catch (err) {
      console.error("Error sending offer:", err);
    }
  };

  const handleOfferAction = async (
    msgId: string,
    action: "accepted" | "rejected",
  ) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, "chats", id, "messages", msgId), {
        "offerDetails.status": action,
        updatedAt: serverTimestamp(),
      });

      const statusText =
        action === "accepted" ? "Accepted offer" : "Rejected offer";
      await updateDoc(doc(db, "chats", id), {
        lastMessage: statusText,
        lastMessageAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(`Error ${action} offer:`, err);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video",
  ) => {
    const file = e.target.files?.[0];
    if (!file || !id || !auth.currentUser) return;

    setIsUploading(true);
    try {
      // 1. Upload to Cloudinary
      const uploadResult = await uploadImage(file);
      const fileUrl = uploadResult.url;

      // 2. Add message to Firestore
      await addDoc(collection(db, "chats", id, "messages"), {
        chatId: id,
        senderId: auth.currentUser!.uid,
        type,
        fileUrl: fileUrl,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "chats", id), {
        lastMessage: type === "image" ? "Sent an image" : "Sent a video",
        lastMessageAt: serverTimestamp(),
      });
    } catch (err: any) {
      console.error("Error sending file:", err);
      const errorMsg = err.message || "Unknown error";
      alert(
        `File upload failed: ${errorMsg}\n\nPlease ensure your Cloudinary credentials are set up on the server.`,
      );
    } finally {
      setIsUploading(false);
      setShowAttachments(false);
    }
  };

  const openLocationPicker = () => {
    if (!navigator.geolocation) {
      setShowMapPicker(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPickedLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setShowMapPicker(true);
      },
      () => {
        setShowMapPicker(true);
      },
    );
  };

  const sharePickedLocation = async () => {
    if (!id || !auth.currentUser || !pickedLocation) return;

    try {
      await addDoc(collection(db, "chats", id, "messages"), {
        chatId: id,
        senderId: auth.currentUser!.uid,
        type: "location",
        location: {
          latitude: pickedLocation.latitude,
          longitude: pickedLocation.longitude,
          isLive: false,
        },
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "chats", id), {
        lastMessage: "Shared location",
        lastMessageAt: serverTimestamp(),
      });

      setShowMapPicker(false);
      setShowAttachments(false);
      setPickedLocation(null);
    } catch (err) {
      console.error("Error sharing location:", err);
    }
  };

  const openLiveLocationPicker = () => {
    if (!navigator.geolocation) {
      setShowLiveLocationDialog(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPickedLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setShowLiveLocationDialog(true);
      },
      () => {
        setShowLiveLocationDialog(true);
      },
    );
  };

  const startLiveTracking = async () => {
    if (!id || !auth.currentUser || !pickedLocation) return;
    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + liveDuration);

      const msgRef = await addDoc(collection(db, "chats", id, "messages"), {
        chatId: id,
        senderId: auth.currentUser!.uid,
        type: "location",
        location: {
          latitude: pickedLocation.latitude,
          longitude: pickedLocation.longitude,
          isLive: true,
          expiresAt: Timestamp.fromDate(expiresAt),
        },
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "chats", id), {
        lastMessage: "Started live tracking",
        lastMessageAt: serverTimestamp(),
      });

      setIsLiveTracking(true);
      trackingMsgId.current = msgRef.id;

      trackingIntervalRef.current = setInterval(() => {
        if (new Date() > expiresAt) {
          stopLiveTracking();
          return;
        }
        navigator.geolocation.getCurrentPosition(async (pos) => {
          if (!trackingMsgId.current || !id) return;
          try {
            await updateDoc(
              doc(db, "chats", id, "messages", trackingMsgId.current),
              {
                "location.latitude": pos.coords.latitude,
                "location.longitude": pos.coords.longitude,
                updatedAt: serverTimestamp(),
              },
            );
          } catch (e) {
            console.error(e);
          }
        });
      }, 10000); // 10s

      setShowLiveLocationDialog(false);
      setShowAttachments(false);
      setPickedLocation(null);
    } catch (err) {
      console.error("Error starting live tracking:", err);
    }
  };

  const stopLiveTracking = async () => {
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }

    if (trackingMsgId.current && id) {
      await updateDoc(doc(db, "chats", id, "messages", trackingMsgId.current), {
        "location.isLive": false,
        updatedAt: serverTimestamp(),
      });
    }

    setIsLiveTracking(false);
    trackingMsgId.current = null;
  };

  const toggleListening = () => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionClass() as SpeechRecognition;
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setNewMessage((prev) => prev + (prev ? " " : "") + transcript);
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
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
    };
  }, []);

  const startCall = () => {
    if (!id || !targetUser) return;
    initiateCall(id, targetUser.uid, targetUser.displayName);
  };

  const handleDeleteChat = async () => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, "chats", id));
      navigate("/chats");
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

  const handleDeleteListing = async () => {
    if (!chat?.listingId || !id) return;
    try {
      await deleteDoc(doc(db, "listings", chat.listingId));
      await deleteDoc(doc(db, "chats", id));
      navigate("/");
    } catch (error) {
      console.error("Error deleting listing:", error);
    }
  };

  useEffect(() => {
    if (!id || !auth.currentUser) return;

    // Fetch chat details
    const fetchChat = async () => {
      const docRef = doc(db, "chats", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setChat({ id: docSnap.id, ...docSnap.data() } as Chat);
      }
    };
    fetchChat();

    // Listen for messages
    const q = query(
      collection(db, "chats", id, "messages"),
      orderBy("createdAt", "asc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Message,
        );
        setMessages(docs);

        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `chats/${id}/messages`);
      },
    );

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (!chat || !auth.currentUser) return;
    const targetId = chat.participants.find((p) => p !== auth.currentUser?.uid);
    if (!targetId) return;

    const unsubscribe = onSnapshot(doc(db, "users", targetId), (doc) => {
      if (doc.exists()) {
        setTargetUser({ uid: doc.id, ...doc.data() } as UserProfile);
      }
    });

    return () => unsubscribe();
  }, [chat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !auth.currentUser || !newMessage.trim()) return;

    const text = newMessage.trim();
    await sendMessage(text);
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!id || !auth.currentUser) return;
    try {
      await deleteDoc(doc(db, "chats", id, "messages", msgId));
    } catch (error) {
      console.error("Error deleting message: ", error);
    }
  };

  const sendMessage = async (text: string) => {
    if (!id || !auth.currentUser) return;

    setNewMessage("");

    try {
      // Add message
      await addDoc(collection(db, "chats", id, "messages"), {
        chatId: id,
        senderId: auth.currentUser.uid,
        text,
        createdAt: serverTimestamp(),
      });

      // Update chat last message
      await updateDoc(doc(db, "chats", id), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  if (!chat)
    return (
      <div className="h-96 flex items-center justify-center">
        Loading chat...
      </div>
    );

  return (
    <div className="w-full max-w-5xl mx-auto h-[100dvh] md:h-[calc(100vh-64px)] flex flex-col bg-[#f8fafc] md:rounded-3xl shadow-xl border border-slate-200/60 overflow-hidden relative selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <div className="p-3 md:p-5 border-b border-slate-200/50 flex items-center justify-between bg-white/70 backdrop-blur-xl sticky top-0 z-10 shrink-0 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/chats")}
            className="md:hidden shrink-0"
          >
            <ChevronLeft />
          </Button>
          <Avatar className="w-9 h-9 md:w-11 md:h-11 shadow-sm ring-2 ring-white shrink-0 bg-slate-100">
            <AvatarImage src={chat.listingImage} className="object-cover" />
            <AvatarFallback>{chat.listingTitle[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 text-sm md:text-base truncate leading-tight">
              {chat.listingTitle}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  targetUser?.isOnline
                    ? "bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]"
                    : "bg-slate-300",
                )}
              />
              <p
                className={cn(
                  "text-[9px] md:text-[10px] font-bold uppercase tracking-wider",
                  targetUser?.isOnline ? "text-green-600" : "text-slate-400",
                )}
              >
                {targetUser?.isOnline ? "Active" : "Offline"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-0.5 md:gap-1 items-center shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={startCall}
            disabled={!targetUser?.isOnline}
            className={cn(
              "h-9 w-9 transition-colors",
              targetUser?.isOnline
                ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                : "text-slate-300 opacity-50 cursor-not-allowed",
            )}
          >
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Info className="w-5 h-5 text-slate-400" />
          </Button>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMenu(!showMenu)}
              className="h-9 w-9"
            >
              <MoreVertical className="w-5 h-5 text-slate-400" />
            </Button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowDeleteConfirm(true);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete Chat
                </button>
                {auth.currentUser?.uid === chat.sellerId && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowDeleteListingConfirm(true);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <PackageX className="w-4 h-4" /> Delete Listing
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <AdMobBanner
        placement="chat"
        className="shrink-0 rounded-none border-x-0 border-t-0 my-0 h-10 border-b border-slate-200/50 bg-slate-50"
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-slate-50/50 to-slate-100 overscroll-contain">
        <div className="space-y-4 pb-2">
          {messages.map((msg) => {
            const isMe = msg.senderId === auth.currentUser?.uid;
            const isCall = msg.type === "call";

            return (
              <motion.div
                key={msg.id}
                layout
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-2`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSelectedMessage(msg);
                }}
              >
                <div
                  className={`max-w-[80%] p-3.5 sm:p-4 rounded-3xl relative cursor-pointer active:scale-[0.98] transition-transform ${
                    isMe
                      ? "bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-br-sm shadow-[0_4px_15px_-3px_rgba(79,70,229,0.2)]"
                      : "bg-white text-slate-800 border border-slate-100/60 rounded-bl-sm shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)]"
                  } ${isCall || msg.type === "location" ? "min-w-[140px]" : ""}`}
                  onTouchStart={() => handlePressStart(msg)}
                  onTouchEnd={handlePressEnd}
                  onTouchCancel={handlePressEnd}
                  onMouseDown={() => handlePressStart(msg)}
                  onMouseUp={handlePressEnd}
                  onMouseLeave={handlePressEnd}
                >
                  {isCall ? (
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "p-2 rounded-full",
                          isMe ? "bg-white/20" : "bg-blue-100",
                        )}
                      >
                        <Phone
                          className={cn(
                            "w-4 h-4",
                            isMe ? "text-white" : "text-blue-600",
                          )}
                        />
                      </div>
                      <div className="flex flex-col">
                        <p className="text-sm font-semibold">{msg.text}</p>
                        <p className="text-[10px] opacity-70">
                          {msg.callStatus === "missed"
                            ? "No answer"
                            : "Voice call"}
                        </p>
                      </div>
                    </div>
                  ) : msg.type === "image" ? (
                    <img
                      src={msg.fileUrl}
                      alt="Sent image"
                      className="max-w-full rounded-lg mb-1 shadow-sm"
                    />
                  ) : msg.type === "video" ? (
                    <video
                      src={msg.fileUrl}
                      controls
                      className="max-w-full rounded-lg mb-1 shadow-sm"
                    />
                  ) : msg.type === "location" ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`https://www.google.com/maps?q=${msg.location?.latitude},${msg.location?.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "flex-1 flex items-center gap-3 p-2 rounded-xl transition-colors",
                            isMe
                              ? "bg-white/10 hover:bg-white/20"
                              : "bg-slate-100 hover:bg-slate-200",
                          )}
                        >
                          <div
                            className={cn(
                              "p-2 rounded-lg",
                              isMe ? "bg-white/20" : "bg-blue-100",
                            )}
                          >
                            <MapPin
                              className={cn(
                                "w-4 h-4",
                                isMe ? "text-white" : "text-blue-600",
                              )}
                            />
                          </div>
                          <div className="flex flex-col">
                            <p className="text-xs font-semibold">
                              {msg.location?.isLive
                                ? "Live Location"
                                : "Shared Location"}
                            </p>
                            <p className="text-[9px] opacity-70">
                              Click to view on map
                            </p>
                          </div>
                        </a>
                        <button
                          onClick={async () => {
                            const url = `https://www.google.com/maps?q=${msg.location?.latitude},${msg.location?.longitude}`;
                            try {
                              if (navigator.share) {
                                await navigator.share({
                                  title: "Shared Location",
                                  url,
                                });
                              } else {
                                throw new Error(
                                  "navigator.share not supported",
                                );
                              }
                            } catch (err) {
                              if (
                                err instanceof Error &&
                                err.name === "AbortError"
                              ) {
                                return;
                              }
                              console.warn(
                                "navigator.share failed, falling back to clipboard:",
                                err,
                              );
                              try {
                                await navigator.clipboard.writeText(url);
                                alert("Link copied to clipboard!");
                              } catch (clipErr) {
                                console.error(
                                  "Clipboard fallback failed:",
                                  clipErr,
                                );
                              }
                            }
                          }}
                          className={cn(
                            "p-3 rounded-xl transition-colors flex items-center justify-center",
                            isMe
                              ? "bg-white/10 hover:bg-white/20 text-white"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700",
                          )}
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                      {msg.location?.isLive && isMe && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={stopLiveTracking}
                          className="w-full text-[10px] h-6 text-white hover:bg-white/10"
                        >
                          Stop Tracking
                        </Button>
                      )}
                    </div>
                  ) : msg.type === "offer" ? (
                    <div className="space-y-3 min-w-[200px]">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "p-2 rounded-xl",
                            isMe ? "bg-white/20" : "bg-orange-100",
                          )}
                        >
                          <HandCoins
                            className={cn(
                              "w-5 h-5",
                              isMe ? "text-white" : "text-orange-600",
                            )}
                          />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-wider opacity-70">
                            Price Offer
                          </p>
                          <p className="text-lg font-bold">
                            ₹{msg.offerDetails?.price}
                          </p>
                        </div>
                      </div>

                      <div
                        className={cn(
                          "p-2 rounded-xl text-center text-xs font-bold",
                          msg.offerDetails?.status === "accepted"
                            ? "bg-green-500/20 text-green-100"
                            : msg.offerDetails?.status === "rejected"
                              ? "bg-red-500/20 text-red-100"
                              : isMe
                                ? "bg-white/10"
                                : "bg-slate-100",
                        )}
                      >
                        {msg.offerDetails?.status === "pending"
                          ? "Pending Approval"
                          : msg.offerDetails?.status === "accepted"
                            ? "Accepted"
                            : "Rejected"}
                      </div>

                      {!isMe && msg.offerDetails?.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white h-8"
                            onClick={() =>
                              handleOfferAction(msg.id, "accepted")
                            }
                          >
                            <Check className="w-4 h-4 mr-1" /> Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 h-8 font-bold"
                            onClick={() =>
                              handleOfferAction(msg.id, "rejected")
                            }
                          >
                            <Ban className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  )}
                  <p className={`text-[10px] mt-1 text-right opacity-70`}>
                    {msg.createdAt
                      ?.toDate()
                      .toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                  </p>
                </div>
              </motion.div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-3 md:p-4 border-t border-slate-200/50 bg-white/80 backdrop-blur-xl sticky bottom-0 z-10 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
        {showAttachments && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-[calc(100%+8px)] left-3 right-3 p-4 bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 grid grid-cols-4 gap-2 md:gap-4 max-w-sm"
          >
            <div className="flex flex-col items-center gap-2">
              <label className="cursor-pointer group flex flex-col items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "image")}
                />
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-[0_4px_12px_rgba(59,130,246,0.15)] border border-blue-200 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/40 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <ImageIcon className="w-5 h-5 md:w-6 md:h-6 relative z-10" />
                </motion.div>
                <span className="text-[9px] md:text-[10px] font-bold text-slate-600 group-hover:text-blue-600 transition-colors duration-200">
                  Photo
                </span>
              </label>
            </div>
            <div className="flex flex-col items-center gap-2">
              <label className="cursor-pointer group flex flex-col items-center gap-2">
                <Input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "video")}
                />
                <motion.div
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 rounded-2xl flex items-center justify-center shadow-[0_4px_12px_rgba(168,85,247,0.15)] border border-purple-200 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/40 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <Video className="w-5 h-5 md:w-6 md:h-6 relative z-10" />
                </motion.div>
                <span className="text-[9px] md:text-[10px] font-bold text-slate-600 group-hover:text-purple-600 transition-colors duration-200">
                  Video
                </span>
              </label>
            </div>
            <button
              onClick={() => openLocationPicker()}
              className="flex flex-col items-center gap-2 group"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-green-50 to-green-100 text-green-600 rounded-2xl flex items-center justify-center shadow-[0_4px_12px_rgba(34,197,94,0.15)] border border-green-200 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/40 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <MapPin className="w-5 h-5 md:w-6 md:h-6 relative z-10" />
              </motion.div>
              <span className="text-[9px] md:text-[10px] font-bold text-slate-600 group-hover:text-green-600 transition-colors duration-200">
                Map
              </span>
            </button>
            <button
              onClick={() => openLiveLocationPicker()}
              className="flex flex-col items-center gap-2 group"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: -5 }}
                whileTap={{ scale: 0.9 }}
                className={cn(
                  "w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center border relative overflow-hidden transition-colors duration-200",
                  isLiveTracking
                    ? "bg-red-500 text-white border-red-600 shadow-[0_4px_12px_rgba(239,68,68,0.4)]"
                    : "bg-gradient-to-br from-red-50 to-red-100 text-red-600 border-red-200 shadow-[0_4px_12px_rgba(239,68,68,0.15)]",
                )}
              >
                <div className="absolute inset-0 bg-white/40 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <Activity className="w-5 h-5 md:w-6 md:h-6 relative z-10" />
              </motion.div>
              <span className="text-[9px] md:text-[10px] font-bold text-slate-600 group-hover:text-red-600 transition-colors duration-200">
                Live
              </span>
            </button>
          </motion.div>
        )}

        <form
          onSubmit={handleSendMessage}
          className="flex gap-1.5 md:gap-2 max-w-5xl mx-auto items-center"
        >
          <div className="flex items-center bg-slate-100 rounded-full p-1 gap-1 border border-slate-200/50 shadow-sm shrink-0">
            <motion.button
              type="button"
              onClick={() => setShowOfferDialog(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="h-8 md:h-9 px-3 flex items-center justify-center bg-orange-600 text-white rounded-full shadow-md shadow-orange-200 border border-orange-500 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <Tag className="w-4 h-4 md:w-5 md:h-5 relative z-10" />
              <motion.div
                layoutId="offer-glow"
                initial={{ opacity: 0.5 }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-orange-400 blur-md -z-10"
              />
            </motion.button>

            <div className="w-[1px] h-4 bg-slate-300/50 mx-0.5" />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowAttachments(!showAttachments)}
              className={cn(
                "shrink-0 h-8 w-8 md:h-9 md:w-9 rounded-full transition-all duration-200",
                showAttachments
                  ? "text-blue-600 bg-blue-50/50 scale-110"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white",
              )}
            >
              {showAttachments ? (
                <X className="w-4 h-4 md:w-5 md:h-5" />
              ) : (
                <Paperclip className="w-4 h-4 md:w-5 md:h-5" />
              )}
            </Button>
          </div>
          <div className="flex-1 relative group">
            <Input
              placeholder={isUploading ? "Uploading..." : "Type a message..."}
              value={newMessage}
              disabled={isUploading}
              onChange={(e) => setNewMessage(e.target.value)}
              className="w-full bg-slate-100/60 border border-transparent hover:border-slate-200 focus-visible:ring-blue-500/30 h-11 md:h-12 rounded-full px-5 pr-12 disabled:opacity-50 text-sm md:text-base font-medium transition-all duration-300 focus:bg-white focus:shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] focus:border-slate-200"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <AnimatePresence>
                {isListening && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex gap-1 items-center mr-1"
                  >
                    {[1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ height: [4, 12, 4] }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                          delay: i * 0.1,
                        }}
                        className="w-0.5 bg-red-500 rounded-full"
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleListening}
                className={cn(
                  "h-8 w-8 rounded-full transition-all duration-300 relative",
                  isListening
                    ? "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/40"
                    : "text-slate-400 hover:text-blue-600 hover:bg-blue-50",
                )}
              >
                {isListening && (
                  <motion.div
                    layoutId="ripple"
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute inset-0 rounded-full bg-red-500"
                  />
                )}
                <Mic
                  className={cn(
                    "w-4 h-4 relative z-10",
                    isListening && "animate-pulse",
                  )}
                />
              </Button>
            </div>
          </div>
          <Button
            type="submit"
            size="icon"
            className="bg-blue-600 hover:bg-blue-700 shrink-0 h-10 w-10"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Chat
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chat? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteChat}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDeleteListingConfirm}
        onOpenChange={setShowDeleteListingConfirm}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <PackageX className="w-5 h-5" />
              Delete Listing
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this listing? This will also
              permanently delete this chat. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteListingConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteListing}>
              Delete Listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HandCoins className="w-5 h-5 text-orange-600" />
              Make an Offer
            </DialogTitle>
            <DialogDescription>
              Enter the amount you're willing to pay for this item.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                ₹
              </span>
              <Input
                type="number"
                placeholder="0.00"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                className="pl-8 text-xl font-bold"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOfferDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={sendOffer}
              disabled={!offerPrice || parseFloat(offerPrice) <= 0}
            >
              Send Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMapPicker} onOpenChange={setShowMapPicker}>
        <DialogContent className="sm:max-w-[500px] h-[70vh] flex flex-col p-0 overflow-hidden gap-0 sm:rounded-[24px]">
          <DialogHeader className="p-4 md:p-6 border-b bg-white/90 backdrop-blur-md shrink-0 sticky top-0 z-10">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
              <div className="p-2 bg-green-100 text-green-600 rounded-xl">
                <MapPin className="w-5 h-5" />
              </div>
              Send Location
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm">
              Tap anywhere on the map to drop a pin, then send it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 w-full bg-slate-50 relative">
            {showMapPicker && (
              <MapContainer
                center={[mapCenter.lat, mapCenter.lng]}
                zoom={14}
                className="z-0"
                style={{ height: "100%", width: "100%" }}
                zoomControl={false}
              >
                <TileLayer
                  attribution="&copy; CARTO"
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <LocationMapPicker
                  onSelect={(lat, lng) =>
                    setPickedLocation({ latitude: lat, longitude: lng })
                  }
                />
                {pickedLocation && (
                  <Marker
                    position={[
                      pickedLocation.latitude,
                      pickedLocation.longitude,
                    ]}
                  />
                )}
              </MapContainer>
            )}

            {!pickedLocation && (
              <div className="absolute inset-x-0 top-4 flex justify-center z-10 pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur-md text-white px-4 py-2 text-sm font-medium rounded-full shadow-lg flex items-center gap-2 animate-bounce">
                  <MapPin className="w-4 h-4" /> Tap to select location
                </div>
              </div>
            )}
          </div>
          <div className="p-4 md:p-6 bg-white border-t flex justify-end gap-3 shrink-0">
            <Button
              variant="ghost"
              onClick={() => setShowMapPicker(false)}
              className="rounded-xl px-6"
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-8 shadow-lg shadow-green-200"
              onClick={sharePickedLocation}
              disabled={!pickedLocation}
            >
              Send Location
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showLiveLocationDialog}
        onOpenChange={setShowLiveLocationDialog}
      >
        <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col p-0 overflow-hidden gap-0 sm:rounded-[24px]">
          <DialogHeader className="p-4 md:p-6 border-b bg-white/90 backdrop-blur-md shrink-0 sticky top-0 z-10">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
              <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                <Activity className="w-5 h-5" />
              </div>
              Share Live Location
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm">
              Your real-time location will be tracked in this chat.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 w-full bg-slate-50 relative">
            {showLiveLocationDialog && pickedLocation && (
              <MapContainer
                center={[pickedLocation.latitude, pickedLocation.longitude]}
                zoom={15}
                className="z-0"
                style={{ height: "100%", width: "100%" }}
                zoomControl={false}
              >
                <TileLayer
                  attribution="&copy; CARTO"
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <Marker
                  position={[pickedLocation.latitude, pickedLocation.longitude]}
                />
              </MapContainer>
            )}

            <div className="absolute inset-x-0 top-4 flex justify-center z-10 pointer-events-none">
              <div className="bg-red-500/90 backdrop-blur-md text-white px-4 py-2 text-sm font-medium rounded-full shadow-lg shadow-red-500/20 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />{" "}
                Tracking ready
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6 bg-white border-t space-y-5 shrink-0">
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Share Duration
              </label>
              <div className="flex gap-2">
                {[15, 60, 480].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setLiveDuration(mins)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border",
                      liveDuration === mins
                        ? "bg-red-50 text-red-600 border-red-200 ring-2 ring-red-600/20"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300",
                    )}
                  >
                    {mins === 15 ? "15 min" : mins === 60 ? "1 hr" : "8 hrs"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setShowLiveLocationDialog(false)}
                className="rounded-xl px-6"
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-8 shadow-lg shadow-red-200"
                onClick={startLiveTracking}
                disabled={!pickedLocation}
              >
                Start Sharing
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!selectedMessage}
        onOpenChange={() => setSelectedMessage(null)}
      >
        <DialogContent className="sm:max-w-[320px] rounded-[24px] p-6 gap-6 outline-none">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-2">
              <MoreVertical className="w-6 h-6 text-slate-600" />
            </div>
            <DialogTitle className="text-xl font-bold">
              Message Options
            </DialogTitle>
            <DialogDescription>
              What would you like to do with this message?
            </DialogDescription>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            {selectedMessage?.senderId === auth.currentUser?.uid && (
              <Button
                variant="destructive"
                className="w-full rounded-xl h-12 text-base font-semibold"
                onClick={() => {
                  if (selectedMessage) {
                    handleDeleteMessage(selectedMessage.id);
                    setSelectedMessage(null);
                  }
                }}
              >
                <Trash2 className="w-5 h-5 mr-2" />
                Delete message
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full rounded-xl h-12 text-base font-medium"
              onClick={() => setSelectedMessage(null)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
