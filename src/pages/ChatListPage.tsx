import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { Chat } from "../types";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageCircle,
  ChevronRight,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AdMobBanner from "../components/AdMobBanner";

export default function ChatListPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "buying" | "selling">(
    "all",
  );

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", auth.currentUser.uid),
      orderBy("lastMessageAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Chat,
        );
        setChats(docs);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "chats");
      },
    );

    return () => unsubscribe();
  }, []);

  const filteredChats = chats.filter((chat) => {
    if (!auth.currentUser) return false;
    if (activeTab === "all") return true;

    const isSeller = chat.sellerId === auth.currentUser.uid;
    if (activeTab === "selling") return isSeller;
    if (activeTab === "buying") return !isSeller;
    return true;
  });

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setChatToDelete(chatId);
  };

  const confirmDeleteChat = async () => {
    if (!chatToDelete) return;

    setDeletingId(chatToDelete);
    const idToDelete = chatToDelete;
    setChatToDelete(null);

    try {
      await deleteDoc(doc(db, "chats", idToDelete));
    } catch (error) {
      console.error("Error deleting chat:", error);
      alert("Failed to delete chat.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading)
    return (
      <div className="h-96 flex items-center justify-center">
        Loading chats...
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-24 md:pb-8 pt-4 md:pt-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
          Messages
        </h1>
        <p className="text-slate-500 font-medium">
          Keep track of your buying and selling conversations.
        </p>
      </div>

      <div className="flex p-1.5 bg-slate-100/80 backdrop-blur-md rounded-2xl shadow-inner border border-slate-200/50 relative">
        {(["all", "buying", "selling"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 relative z-10",
              activeTab === tab
                ? "text-blue-700 shadow-[0_2px_10px_-3px_rgba(59,130,246,0.3)] bg-white border border-blue-100/50"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50",
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <AdMobBanner placement="chat" className="my-0" />

      {filteredChats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 bg-gradient-to-b from-white to-slate-50/50 rounded-3xl border border-slate-200/60 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] text-center">
          <div className="w-20 h-20 mb-6 rounded-3xl bg-blue-50 flex items-center justify-center shadow-inner border border-blue-100/50">
            <MessageCircle className="w-10 h-10 text-blue-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            No conversations yet
          </h3>
          <p className="text-slate-500 max-w-sm mb-8">
            {activeTab === "all"
              ? "When you contact a seller or someone contacts you, the messages will appear here."
              : `You don't have any active ${activeTab} conversations right now.`}
          </p>
          <Link to="/">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 shadow-lg shadow-blue-200 font-semibold h-12">
              Start browsing items
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredChats.map((chat) => {
            const isSeller = chat.sellerId === auth.currentUser?.uid;
            return (
              <Card
                key={chat.id}
                className="border-slate-200/60 bg-white hover:bg-slate-50/80 transition-all duration-300 overflow-hidden shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-3xl group relative"
              >
                <div className="flex h-full w-full relative">
                  <Link
                    to={`/chat/${chat.id}`}
                    className="block outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex-1"
                  >
                    <CardContent className="p-4 sm:p-5 flex items-center gap-4 sm:gap-5">
                      <div className="relative shrink-0">
                        <Avatar className="w-16 h-16 sm:w-20 sm:h-20 shadow-sm ring-4 ring-slate-50 group-hover:ring-white transition-all">
                          <AvatarImage
                            src={chat.listingImage}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-slate-100 text-slate-400 font-medium text-xl">
                            {chat.listingTitle[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={cn(
                            "absolute -bottom-1 -right-1 p-1.5 rounded-2xl border-4 border-white shadow-sm transition-transform group-hover:scale-110",
                            isSeller
                              ? "bg-gradient-to-br from-orange-400 to-orange-600"
                              : "bg-gradient-to-br from-indigo-500 to-blue-600",
                          )}
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 py-1">
                        <div className="flex justify-between items-start mb-1.5">
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                              {chat.listingTitle}
                            </h3>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px] px-2 py-0.5 h-5 font-bold uppercase tracking-wider rounded-md border-0 shrink-0",
                                isSeller
                                  ? "bg-orange-100/80 text-orange-700"
                                  : "bg-blue-100/80 text-blue-700",
                              )}
                            >
                              {isSeller ? "Selling" : "Buying"}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-slate-500 truncate pr-6 group-hover:text-slate-600 transition-colors">
                          {chat.lastMessage || "No messages yet..."}
                        </p>
                      </div>
                    </CardContent>
                  </Link>
                  <div className="flex items-center gap-1 sm:gap-3 shrink-0 absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-auto">
                    <button
                      onClick={(e) => handleDeleteChat(e, chat.id)}
                      disabled={deletingId === chat.id}
                      className={cn(
                        "p-2.5 rounded-xl transition-all duration-300",
                        deletingId === chat.id
                          ? "text-red-500 bg-red-50/80"
                          : "text-slate-300 hover:text-red-600 hover:bg-red-50 hover:shadow-sm opacity-0 group-hover:opacity-100 md:opacity-100 md:hover:bg-red-50 active:scale-95 border border-transparent hover:border-red-100",
                      )}
                      title="Delete Chat"
                    >
                      {deletingId === chat.id ? (
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </button>
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all pointer-events-none" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!chatToDelete}
        onOpenChange={(open) => !open && setChatToDelete(null)}
      >
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
            <Button variant="outline" onClick={() => setChatToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteChat}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
