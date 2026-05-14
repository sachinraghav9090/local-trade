import React, { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface VoiceCallProps {
  chatId: string;
  targetId: string;
  targetName: string;
  isCaller: boolean;
  onClose: () => void;
  callId?: string;
  isMinimized?: boolean;
  onMinimize?: () => void;
}

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

export default function VoiceCall({
  chatId,
  targetId,
  targetName,
  isCaller,
  onClose,
  callId: initialCallId,
  isMinimized = false,
  onMinimize,
}: VoiceCallProps) {
  const [status, setStatus] = useState<
    "initiating" | "ringing" | "connected" | "ended" | "rejected"
  >("initiating");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const [callId, setCallId] = useState<string | null>(initialCallId || null);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const logRef = useRef(false);
  const activeCallIdRef = useRef<string | null>(null);
  const unsubs = useRef<(() => void)[]>([]);
  const creatingRef = useRef(false);

  useEffect(() => {
    let timer: any;
    if (status === "connected") {
      timer = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    let isMounted = true;

    const initializeCall = async () => {
      // 1. Get local stream
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStream.current = stream;
      } catch (err) {
        if (!isMounted) return;
        console.error("Could not acquire microphone:", err);
        alert("Microphone access is required for audio calls.");
        onClose();
        return;
      }

      // 2. Setup PeerConnection
      if (!isMounted) return;
      peerConnection.current = new RTCPeerConnection(servers);

      // Add local tracks
      localStream.current.getTracks().forEach((track) => {
        if (localStream.current) {
          peerConnection.current?.addTrack(track, localStream.current);
        }
      });

      // Handle remote tracks
      peerConnection.current.ontrack = (event) => {
        if (!isMounted) return;
        remoteStream.current = event.streams[0];
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream.current;
        }
      };

      if (isCaller) {
        let callDocId = activeCallIdRef.current;
        if (!callDocId && !creatingRef.current) {
          creatingRef.current = true;
          // Create Call Doc
          const callDoc = await addDoc(collection(db, "calls"), {
            chatId,
            callerId: auth.currentUser?.uid,
            callerName: auth.currentUser?.displayName || "User",
            receiverId: targetId,
            receiverName: targetName,
            participants: [auth.currentUser?.uid, targetId],
            status: "ringing",
            createdAt: serverTimestamp(),
          });
          if (!isMounted) return;
          callDocId = callDoc.id;
          activeCallIdRef.current = callDoc.id;
        } else if (callDocId) {
          // We are in a strict mode remount, the document exists, we should update it
          await updateDoc(doc(db, "calls", callDocId), {
            status: "ringing",
            offer: null, // Reset previous offer to allow negotiation again
          });
          if (!isMounted) return;
        } else {
          // still creating, waiting...
          return;
        }

        setCallId(callDocId);
        setStatus("ringing");

        // Signaling logic for caller
        const callerCandidatesCollection = collection(
          db,
          "calls",
          callDocId,
          "callerCandidates",
        );
        peerConnection.current.onicecandidate = (event) => {
          if (!isMounted) return;
          if (event.candidate) {
            addDoc(callerCandidatesCollection, event.candidate.toJSON());
          }
        };

        const offerDescription = await peerConnection.current.createOffer();
        if (!isMounted) return;
        await peerConnection.current.setLocalDescription(offerDescription);

        const offer = {
          sdp: offerDescription.sdp,
          type: offerDescription.type,
        };

        if (!isMounted) return;
        await updateDoc(doc(db, "calls", callDocId), { offer });

        // Listen for answer
        if (!isMounted) return;
        const unsubCall = onSnapshot(
          doc(db, "calls", callDocId),
          (snapshot) => {
            const data = snapshot.data();
            if (
              !peerConnection.current?.currentRemoteDescription &&
              data?.answer
            ) {
              const answerDescription = new RTCSessionDescription(data.answer);
              if (peerConnection.current?.signalingState !== "closed") {
                peerConnection.current
                  ?.setRemoteDescription(answerDescription)
                  .catch((e) =>
                    console.error("setRemoteDescription error:", e),
                  );
              }
            }
            if (data?.status === "connected") setStatus("connected");
            if (data?.status === "rejected") {
              setStatus("rejected");
              setTimeout(onClose, 2000);
            }
            if (data?.status === "ended") {
              handleHangup();
            }
          },
        );
        unsubs.current.push(unsubCall);

        // Listen for receiver candidates
        const unsubCandidates = onSnapshot(
          collection(db, "calls", callDocId, "receiverCandidates"),
          (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === "added") {
                const data = change.doc.data();
                const candidate = new RTCIceCandidate(data);
                if (peerConnection.current?.signalingState !== "closed") {
                  peerConnection.current
                    ?.addIceCandidate(candidate)
                    .catch((e) => console.error("addIceCandidate error:", e));
                }
              }
            });
          },
        );
        unsubs.current.push(unsubCandidates);
      } else if (initialCallId) {
        // Signaling logic for receiver
        const callDocRef = doc(db, "calls", initialCallId);

        const unsubCall = onSnapshot(callDocRef, (snapshot) => {
          const data = snapshot.data();
          if (data?.status === "ended") {
            handleHangup();
          }
        });
        unsubs.current.push(unsubCall);

        setStatus("ringing"); // Receiver sees ringing (incoming)
      }
    };

    initializeCall();

    return () => {
      isMounted = false;
      unsubs.current.forEach((unsub) => unsub());
      unsubs.current = [];
      localStream.current?.getTracks().forEach((track) => track.stop());
      if (peerConnection.current?.signalingState !== "closed") {
        peerConnection.current?.close();
      }
    };
  }, []);

  const acceptCall = async () => {
    if (!callId || !peerConnection.current) return;

    try {
      const callDocRef = doc(db, "calls", callId);
      const callSnapshot = await getDoc(callDocRef);
      const callData = callSnapshot.data();

      // Signaling for receiver candidates
      const receiverCandidatesCollection = collection(
        db,
        "calls",
        callId,
        "receiverCandidates",
      );
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(receiverCandidatesCollection, event.candidate.toJSON());
        }
      };

      const offerDescription = callData?.offer;
      if (peerConnection.current.signalingState !== "closed") {
        try {
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(offerDescription),
          );

          const answerDescription = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answerDescription);

          const answer = {
            type: answerDescription.type,
            sdp: answerDescription.sdp,
          };

          await updateDoc(callDocRef, { answer, status: "connected" });
          setStatus("connected");
        } catch (err) {
          console.error("Error setting up connection during accept:", err);
        }
      }

      // Listen for caller candidates
      const unsubCallerCands = onSnapshot(
        collection(db, "calls", callId, "callerCandidates"),
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const data = change.doc.data();
              const candidate = new RTCIceCandidate(data);
              if (peerConnection.current?.signalingState !== "closed") {
                peerConnection.current
                  ?.addIceCandidate(candidate)
                  .catch((e) => console.error("addIceCandidate error:", e));
              }
            }
          });
        },
      );
      unsubs.current.push(unsubCallerCands);
    } catch (err) {
      console.error("Error accepting call:", err);
    }
  };

  const rejectCall = async () => {
    if (callId && !logRef.current) {
      logRef.current = true;
      await updateDoc(doc(db, "calls", callId), { status: "rejected" });

      // Log rejection to chat
      const messagesRef = collection(db, "chats", chatId, "messages");
      const chatRef = doc(db, "chats", chatId);

      const logText = "Call rejected";
      await addDoc(messagesRef, {
        chatId,
        senderId: auth.currentUser?.uid,
        text: logText,
        type: "call",
        callStatus: "rejected",
        createdAt: serverTimestamp(),
      });

      await updateDoc(chatRef, {
        lastMessage: logText,
        lastMessageAt: serverTimestamp(),
      });
    }
    onClose();
  };

  const handleHangup = async (isManual: boolean = false) => {
    if (callId && !logRef.current) {
      logRef.current = true;
      const ref = doc(db, "calls", callId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const currentData = snap.data();
        if (
          currentData.status !== "ended" &&
          currentData.status !== "rejected"
        ) {
          await updateDoc(ref, { status: "ended" });
        }

        if (isManual) {
          // Log to chat messages
          const messagesRef = collection(db, "chats", chatId, "messages");
          const chatRef = doc(db, "chats", chatId);

          let callLogText = "Audio Call";
          let finalCallStatus: "ended" | "missed" | "rejected" = "ended";

          if (status === "ringing") {
            callLogText = isCaller ? "Call canceled" : "Missed call";
            finalCallStatus = "missed";
          } else if (status === "connected") {
            callLogText = `Audio call ended • ${formatDuration(duration)}`;
            finalCallStatus = "ended";
          } else if (
            status === "rejected" ||
            currentData.status === "rejected"
          ) {
            callLogText = "Call rejected";
            finalCallStatus = "rejected";
          }

          await addDoc(messagesRef, {
            chatId,
            senderId: auth.currentUser?.uid,
            text: callLogText,
            type: "call",
            callStatus: finalCallStatus,
            duration: duration,
            createdAt: serverTimestamp(),
          });

          await updateDoc(chatRef, {
            lastMessage: callLogText,
            lastMessageAt: serverTimestamp(),
          });
        }
      }
    }

    unsubs.current.forEach((u) => u());
    unsubs.current = [];
    localStream.current?.getTracks().forEach((track) => track.stop());
    if (peerConnection.current?.signalingState !== "closed") {
      peerConnection.current?.close();
    }
    setStatus("ended");
    setTimeout(onClose, 1000);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleMute = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  return (
    <AnimatePresence>
      <div
        className={cn(
          "fixed z-[100] transition-all duration-300",
          isMinimized
            ? "bottom-20 right-4 md:bottom-8 md:right-8 w-48 h-16"
            : "inset-0 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm",
        )}
      >
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className={cn(
            "bg-slate-900 overflow-hidden shadow-2xl flex relative border border-white/10",
            isMinimized
              ? "w-full h-full rounded-2xl p-2 items-center gap-3"
              : "flex-col items-center py-12 px-8 w-full max-w-sm rounded-[2rem]",
          )}
        >
          {/* Background effects (only when not minimized) */}
          {!isMinimized && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full" />
              {status === "ringing" && (
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-blue-600/10 rounded-full"
                />
              )}
            </div>
          )}

          {/* Minimize/Maximize Button */}
          {status === "connected" && onMinimize && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMinimize}
              className={cn(
                "absolute z-20 text-white/50 hover:text-white hover:bg-white/10",
                isMinimized ? "right-1 top-1 w-6 h-6" : "right-6 top-6",
              )}
            >
              {isMinimized ? (
                <Maximize2 className="w-4 h-4" />
              ) : (
                <Minimize2 className="w-6 h-6" />
              )}
            </Button>
          )}

          <Avatar
            className={cn(
              "border-white/10 shadow-2xl relative z-10",
              isMinimized ? "w-10 h-10 border-2" : "w-32 h-32 border-4 mb-6",
            )}
          >
            <AvatarFallback
              className={cn(
                "bg-blue-600 text-white font-bold",
                isMinimized ? "text-lg" : "text-4xl",
              )}
            >
              {targetName?.[0] || "?"}
            </AvatarFallback>
          </Avatar>

          <div
            className={cn(
              "flex flex-col relative z-10",
              isMinimized ? "flex-1 min-w-0" : "items-center",
            )}
          >
            <h2
              className={cn(
                "font-bold truncate",
                isMinimized ? "text-sm text-white" : "text-2xl text-white mb-2",
              )}
            >
              {targetName}
            </h2>

            <div
              className={cn(
                "text-blue-400 font-medium flex items-center gap-2",
                isMinimized ? "text-[10px]" : "mb-12",
              )}
            >
              {status === "connected" ? (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  {formatDuration(duration)}
                </span>
              ) : status === "initiating" ? (
                "Initializing..."
              ) : status === "ringing" ? (
                isCaller ? (
                  "Calling..."
                ) : (
                  "Incoming Call..."
                )
              ) : status === "rejected" ? (
                <span className="text-red-400">Call Rejected</span>
              ) : (
                "Ended"
              )}
            </div>
          </div>

          <div
            className={cn(
              "flex items-center justify-center relative z-10",
              isMinimized ? "gap-2 ml-auto" : "mt-auto w-full gap-8",
            )}
          >
            {status === "ringing" && !isCaller ? (
              <>
                <Button
                  onClick={rejectCall}
                  className={cn(
                    "rounded-full bg-red-500 hover:bg-red-600 p-0 shadow-lg shadow-red-500/20",
                    isMinimized ? "w-8 h-8" : "w-16 h-16",
                  )}
                >
                  <PhoneOff
                    className={cn(isMinimized ? "w-4 h-4" : "w-8 h-8")}
                  />
                </Button>
                <Button
                  onClick={acceptCall}
                  className={cn(
                    "rounded-full bg-green-500 hover:bg-green-600 p-0 shadow-lg shadow-green-500/20",
                    isMinimized ? "w-8 h-8" : "w-16 h-16",
                  )}
                >
                  <Phone className={cn(isMinimized ? "w-4 h-4" : "w-8 h-8")} />
                </Button>
              </>
            ) : (
              <>
                {status === "connected" && !isMinimized && (
                  <>
                    <Button
                      variant="ghost"
                      onClick={toggleMute}
                      className={cn(
                        "w-12 h-12 rounded-full p-0 transition-colors",
                        isMuted
                          ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                          : "bg-white/10 text-white hover:bg-white/20",
                      )}
                    >
                      {isMuted ? (
                        <MicOff className="w-6 h-6" />
                      ) : (
                        <Mic className="w-6 h-6" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                      className="w-12 h-12 rounded-full p-0 bg-white/10 text-white hover:bg-white/20"
                    >
                      {isSpeakerOn ? (
                        <Volume2 className="w-6 h-6" />
                      ) : (
                        <VolumeX className="w-6 h-6" />
                      )}
                    </Button>
                  </>
                )}
                <Button
                  onClick={() => handleHangup(true)}
                  className={cn(
                    "rounded-full bg-red-500 hover:bg-red-600 p-0 shadow-lg shadow-red-500/20",
                    isMinimized ? "w-8 h-8" : "w-16 h-16",
                  )}
                >
                  <PhoneOff
                    className={cn(isMinimized ? "w-4 h-4" : "w-8 h-8")}
                  />
                </Button>
              </>
            )}
          </div>

          <audio ref={remoteAudioRef} autoPlay />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
