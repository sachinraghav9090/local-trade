import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { Listing, Chat } from "../types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Share2,
  Heart,
  MapPin,
  Calendar,
  Shield,
  AlertTriangle,
  MessageCircle,
  MoreVertical,
  Edit,
  Trash2,
  Flag,
  Phone,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  HelpCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { setDoc } from "firebase/firestore";
import AdMobBanner from "../components/AdMobBanner";

export default function ListingDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchListingAndSeller = async () => {
      if (!id) return;
      const docRef = doc(db, "listings", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Listing;
        setListing({ id: docSnap.id, ...data });
      }
      setLoading(false);
    };
    fetchListingAndSeller();
  }, [id]);

  useEffect(() => {
    const checkFavorite = async () => {
      if (!auth.currentUser || !id) return;
      const favRef = doc(db, "users", auth.currentUser.uid, "favorites", id);
      const favSnap = await getDoc(favRef);
      setIsFavorited(favSnap.exists());
    };
    checkFavorite();
  }, [id]);

  useEffect(() => {
    const checkAdmin = async () => {
      const user = auth.currentUser;
      if (!user) return;
      if (user.email === "sachinraghav9090@gmail.com") {
        setIsAdmin(true);
      } else {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === "admin") {
          setIsAdmin(true);
        }
      }
    };
    checkAdmin();
  }, []);

  const handleChat = async () => {
    if (!auth.currentUser) {
      if (window.confirm("Please login to start a chat.")) {
        navigate("/login");
      }
      return;
    }
    if (!listing) return;
    if (auth.currentUser.uid === listing.sellerId) {
      alert("You cannot chat with yourself!");
      return;
    }

    // Check if chat already exists
    const chatsRef = collection(db, "chats");
    const q = query(
      chatsRef,
      where("listingId", "==", listing.id),
      where("participants", "array-contains", auth.currentUser.uid),
    );

    const querySnapshot = await getDocs(q);
    let chatId = "";

    if (!querySnapshot.empty) {
      chatId = querySnapshot.docs[0].id;
    } else {
      // Create new chat
      const newChat = await addDoc(chatsRef, {
        listingId: listing.id,
        listingTitle: listing.title,
        listingImage: listing.images?.[0] || "",
        sellerId: listing.sellerId,
        participants: [auth.currentUser.uid, listing.sellerId],
        lastMessage: "",
        lastMessageAt: serverTimestamp(),
      });
      chatId = newChat.id;
    }

    navigate(`/chat/${chatId}`);
  };

  const toggleFavorite = async () => {
    if (!auth.currentUser) {
      if (window.confirm("Please login to favorite listings.")) {
        navigate("/login");
      }
      return;
    }
    if (!listing) return;
    const favRef = doc(
      db,
      "users",
      auth.currentUser.uid,
      "favorites",
      listing.id,
    );
    try {
      if (isFavorited) {
        await deleteDoc(favRef);
        setIsFavorited(false);
      } else {
        await setDoc(favRef, {
          listingId: listing.id,
          userId: auth.currentUser.uid,
          createdAt: serverTimestamp(),
        });
        setIsFavorited(true);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const handleDeleteListing = async () => {
    if (!listing) return;
    const isOwner = auth.currentUser?.uid === listing.sellerId;
    if (!isAdmin && !isOwner) return;

    setShowMenu(false);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteListing = async () => {
    if (!listing) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "listings", listing.id));
      navigate("/");
    } catch (error) {
      console.error("Error deleting listing:", error);
      alert("Failed to delete listing.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: listing?.title,
      text: `Check out this ${listing?.title} on Local Trade!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        throw new Error("navigator.share not supported");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Share canceled by user");
        return;
      }

      console.warn("navigator.share failed, falling back to clipboard:", err);
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      } catch (clipErr) {
        console.error("Clipboard fallback failed:", clipErr);
      }
    }
  };

  const handleReport = async () => {
    if (!auth.currentUser || !listing) return;

    const reason = window.prompt(
      "Please enter the reason for reporting this ad:",
    );
    if (!reason) return;

    try {
      await addDoc(collection(db, "reports"), {
        listingId: listing.id,
        listingTitle: listing.title,
        reporterId: auth.currentUser.uid,
        reporterEmail: auth.currentUser.email,
        reason,
        createdAt: serverTimestamp(),
        status: "pending",
      });
      alert("Thank you for reporting. We will review this ad shortly.");
    } catch (error) {
      console.error("Error reporting:", error);
      alert("Failed to submit report.");
    }
  };

  const toggleSoldStatus = async () => {
    if (!listing || !auth.currentUser) return;
    const isOwner = auth.currentUser.uid === listing.sellerId;
    if (!isAdmin && !isOwner) return;

    const newStatus = listing.status === "sold" ? "active" : "sold";
    try {
      await updateDoc(doc(db, "listings", listing.id), {
        status: newStatus,
      });
      setListing({ ...listing, status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  if (loading)
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"
        />
        <p className="text-slate-500 font-bold animate-pulse">
          Loading amazing properties...
        </p>
      </div>
    );
  if (!listing)
    return (
      <div className="text-center py-20 text-slate-500 font-bold">
        Listing not found.
      </div>
    );

  const images = listing.images || [
    `https://picsum.photos/seed/${listing.id}/800/600`,
  ];

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-24 md:pb-12 transition-colors duration-300">
      <div className="px-4 lg:px-0">
        <AdMobBanner placement="details" className="my-0" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 lg:px-0">
        {/* Left Column: Images & Description */}
        <div className="lg:col-span-2 space-y-8">
          <div className="relative bg-slate-900 dark:bg-black rounded-[2rem] overflow-hidden group flex items-center justify-center min-h-[400px] md:min-h-[600px] shadow-2xl border border-white/5">
            <img
              src={images[currentImageIndex]}
              alt={listing.title}
              className="max-w-full max-h-[75vh] w-auto h-auto object-contain transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />

            <div className="absolute bottom-8 left-8 right-8 text-white backdrop-blur-md bg-white/10 p-6 rounded-2xl border border-white/20 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
              <Badge className="bg-blue-600 text-white border-none mb-2 font-bold tracking-widest text-[10px] uppercase">
                Original Quality
              </Badge>
              <p className="text-2xl font-black tracking-tight">
                {listing.title}
              </p>
            </div>

            {images.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setCurrentImageIndex((prev) =>
                      prev > 0 ? prev - 1 : images.length - 1,
                    )
                  }
                  className="absolute left-6 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-xl transition-all border border-white/10 hover:scale-110 active:scale-95"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() =>
                    setCurrentImageIndex((prev) =>
                      prev < images.length - 1 ? prev + 1 : 0,
                    )
                  }
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-xl transition-all border border-white/10 hover:scale-110 active:scale-95"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 p-2 bg-black/20 backdrop-blur-xl rounded-full border border-white/10">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImageIndex(i)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${i === currentImageIndex ? "bg-blue-500 w-8" : "bg-white/30 hover:bg-white/60"}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between px-8 py-6">
              <CardTitle className="text-2xl font-black dark:text-white uppercase tracking-tight">
                Product Details
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <HelpCircle className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent className="p-8">
              <p className="text-slate-600 dark:text-slate-300 text-lg whitespace-pre-wrap leading-relaxed font-medium">
                {listing.description ||
                  "No detailed description provided by the seller."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Price, Seller & Actions */}
        <div className="space-y-8">
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-black text-5xl tracking-tighter">
                    <span className="text-2xl opacity-70">₹</span>
                    {listing.price.toLocaleString()}
                  </div>
                  <div className="flex gap-3 mt-4">
                    {listing.status === "sold" ? (
                      <Badge className="bg-red-500 text-white border-none px-4 py-1.5 rounded-full font-black text-xs shadow-lg shadow-red-500/20">
                        SOLD OUT
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500 dark:bg-emerald-600 text-white border-none px-4 py-1.5 rounded-full font-black text-xs shadow-lg shadow-emerald-500/20 tracking-widest">
                        ACTIVE NOW
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className="border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest rounded-full"
                    >
                      {listing.category}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-2xl transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-400 hover:text-blue-600"
                    onClick={handleShare}
                  >
                    <Share2 className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "rounded-2xl transition-all shadow-sm border border-transparent",
                      isFavorited
                        ? "bg-red-500 text-white shadow-red-500/20 scale-110"
                        : "text-slate-400 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20",
                    )}
                    onClick={toggleFavorite}
                  >
                    <Heart
                      className={cn("w-5 h-5", isFavorited && "fill-current")}
                    />
                  </Button>

                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-2xl text-slate-400"
                      onClick={() => setShowMenu(!showMenu)}
                    >
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                    {showMenu && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 py-3 overflow-hidden animate-in fade-in zoom-in duration-200">
                        {(isAdmin ||
                          auth.currentUser?.uid === listing.sellerId) && (
                          <>
                            <button
                              onClick={() => {
                                setShowMenu(false);
                                navigate(`/edit-listing/${listing.id}`);
                              }}
                              className="w-full px-5 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3"
                            >
                              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                <Edit className="w-4 h-4 text-blue-600" />
                              </div>
                              Edit Marketplace Ad
                            </button>
                            <button
                              onClick={() => {
                                setShowMenu(false);
                                handleDeleteListing();
                              }}
                              className="w-full px-5 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-3"
                            >
                              <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </div>
                              Remove Listing
                            </button>
                            <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
                          </>
                        )}
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            handleReport();
                          }}
                          className="w-full px-5 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
                            <Flag className="w-4 h-4 text-orange-600" />
                          </div>
                          Report Violation
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tight">
                {listing.title}
              </h1>

              <div className="flex flex-col gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-blue-600">
                    <MapPin className="w-4 h-4" />
                  </div>
                  {listing.location || "Local Area"}
                </div>
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-blue-600">
                    <Calendar className="w-4 h-4" />
                  </div>
                  Posted{" "}
                  {listing.createdAt
                    ?.toDate()
                    .toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl overflow-hidden border-t-4 border-t-blue-600">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black uppercase tracking-widest dark:text-white">
                  Seller Profile
                </h3>
                <Badge
                  variant="ghost"
                  className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                >
                  VERIFIED USER
                </Badge>
              </div>

              <div className="flex items-center gap-5 mb-8">
                <div className="relative">
                  <Avatar className="w-20 h-20 border-4 border-white dark:border-slate-800 shadow-xl">
                    <AvatarImage src={listing.sellerPhoto} />
                    <AvatarFallback className="bg-blue-600 text-white font-black text-2xl">
                      {listing.sellerName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 border-4 border-white dark:border-slate-900 rounded-full" />
                </div>
                <div>
                  <p className="font-black text-xl text-slate-900 dark:text-white tracking-tight leading-none mb-1">
                    {listing.sellerName}
                  </p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Community Member
                  </p>
                  <div className="flex gap-1 mt-2 items-center">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <ThumbsUp
                        key={s}
                        className="w-3 h-3 text-yellow-500 fill-current"
                      />
                    ))}
                    <span className="text-[10px] font-bold text-slate-500 ml-1">
                      4.9 (12 reviews)
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Button
                  onClick={handleChat}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-14 rounded-2xl text-base font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 group"
                >
                  <MessageCircle className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  Start Chatting
                </Button>

                {(isAdmin || auth.currentUser?.uid === listing.sellerId) && (
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-14 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition-all duration-300",
                        listing.status === "sold"
                          ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                          : "border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-900/20",
                      )}
                      onClick={toggleSoldStatus}
                    >
                      {listing.status === "sold"
                        ? "Restore to Market"
                        : "Mark as Successfully Sold"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <Shield className="w-5 h-5 text-blue-600 shrink-0" />
                <p className="text-[10px] font-bold text-slate-500 leading-tight uppercase tracking-wide">
                  Transactions are protected by our community guidelines. Never
                  pay outside the app without inspection.
                </p>
              </div>
            </CardContent>
          </Card>

          <AdMobBanner
            variant="square"
            placement="details"
            label="Sponsored Content"
            className="mt-4"
          />
        </div>

        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Delete Listing
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this listing? This action cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteListing}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Listing"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
