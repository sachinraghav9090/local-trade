import React, { useState, useEffect } from "react";
import { auth, db, logout } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { updateProfile, updateEmail } from "firebase/auth";
import { UserProfile, Listing, Rule } from "../types";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LogOut,
  Package,
  Heart,
  Settings,
  ChevronRight,
  User as UserIcon,
  MapPin,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  MessageCircle,
  HelpCircle,
  Camera,
  Clock,
  Loader2,
  Phone,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { uploadImage } from "../services/uploadService";
import AdMobBanner from "../components/AdMobBanner";

export default function ProfilePage() {
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<Listing[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [favLoading, setFavLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ads" | "favorites" | "rules">(
    "ads",
  );
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDob, setNewDob] = useState("");
  const [newBio, setNewBio] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user" | "buyer" | "seller">(
    "user",
  );
  const [newReferralCode, setNewReferralCode] = useState("");
  const [newReferredBy, setNewReferredBy] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] =
    useState(false);
  const [listingToDelete, setListingToDelete] = useState<Listing | null>(null);
  const user = auth.currentUser;
  const location = useLocation();

  const handleProfileImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;

    // Restriction: Once a month (30 days) - Bypassed for Admin/Dev testing
    if (
      profile?.lastPhotoUpdate &&
      user.email !== "sachinraghav9090@gmail.com"
    ) {
      const lastUpdate = profile.lastPhotoUpdate.toDate();
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - lastUpdate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 30 && profile.role !== "admin") {
        alert(
          `Note: Profile picture changes are limited to once a month. You need to wait ${30 - diffDays} more days.`,
        );
        return;
      }
    }

    setUpdating(true);
    const file = e.target.files[0];

    // Check file size before processing
    if (file.size > 2 * 1024 * 1024) {
      alert(
        "Selected image is too large. Please select an image smaller than 2MB.",
      );
      setUpdating(false);
      e.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 512; // slightly larger for better quality
        const MAX_HEIGHT = 512;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              setUpdating(false);
              alert("Failed to process image.");
              return;
            }

            try {
              const uploadFile = new File([blob], `profile_${user.uid}.jpg`, {
                type: "image/jpeg",
              });

              const uploadResult = await uploadImage(uploadFile);
              const photoURL = uploadResult.url;

              // Update Firestore User Document
              const userRef = doc(db, "users", user.uid);
              await updateDoc(userRef, {
                photoURL: photoURL,
                lastPhotoUpdate: serverTimestamp(),
              });

              // Update local state immediately
              setProfile((prev) =>
                prev ? { ...prev, photoURL: photoURL } : prev,
              );
              alert("Profile picture updated successfully!");
            } catch (error: any) {
              console.error("Error updating profile picture:", error);
              const errorMsg = error.message || "Failed to upload image.";
              alert(
                `Error: ${errorMsg}\n\nMake sure Cloudinary is configured on the server.`,
              );
            } finally {
              setUpdating(false);
              if (e.target) e.target.value = "";
            }
          },
          "image/jpeg",
          0.8,
        );
      };
      img.onerror = () => {
        setUpdating(false);
        alert("Failed to process image file.");
        e.target.value = "";
      };
      if (typeof event.target?.result === "string") {
        img.src = event.target.result;
      }
    };
    reader.onerror = () => {
      setUpdating(false);
      alert("Failed to read file.");
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveProfileImage = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    // Restriction: Once a month (30 days)
    if (profile?.lastPhotoUpdate) {
      const lastUpdate = profile.lastPhotoUpdate.toDate();
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - lastUpdate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 30 && profile.role !== "admin") {
        alert(
          `You can only modify your profile picture once a month. Please wait ${30 - diffDays} more days.`,
        );
        return;
      }
    }

    setUpdating(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        photoURL: "none", // explicitly mark as none so we can bypass the fallback Google picture
        lastPhotoUpdate: serverTimestamp(),
      });

      alert("Profile picture removed successfully!");
    } catch (error) {
      console.error("Error removing profile picture:", error);
      handleFirestoreError(
        error as any,
        OperationType.UPDATE,
        `/users/${user.uid}`,
      );
      alert("Failed to remove profile picture.");
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab === "ads" || tab === "favorites" || tab === "rules") {
      setActiveTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as UserProfile;
        setProfile(data);
        setNewDisplayName(data.displayName || "");
        setNewMobile(data.mobile || "");
        setNewEmail(data.email || user.email || "");
        setNewDob(data.dob || "");
        setNewBio(data.bio || "");
        setNewAddress(data.address || "");
        setNewRole(data.role || "user");
        setNewReferralCode(data.referralCode || "");
        setNewReferredBy(data.referredBy || "");
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user || !newDisplayName.trim()) return;

    setUpdating(true);
    try {
      // Update Auth Profile
      await updateProfile(user, {
        displayName: newDisplayName,
      });

      if (newEmail && newEmail !== user.email) {
        try {
          await updateEmail(user, newEmail);
        } catch (emailError: any) {
          console.error("Error updating email in Auth:", emailError);
          if (emailError.code === "auth/requires-recent-login") {
            alert(
              "Changing email requires recent login. Please log out and log back in to change your email.",
            );
          } else {
            alert("Failed to update email: " + emailError.message);
          }
        }
      }

      // Update Firestore User Document
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        displayName: newDisplayName,
        mobile: newMobile,
        email: newEmail || user.email,
        dob: newDob,
        bio: newBio,
        address: newAddress,
        role: newRole,
        referralCode: newReferralCode,
        referredBy: newReferredBy,
      });

      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "listings"),
      where("sellerId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as Listing,
      );
      setMyListings(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const favsRef = collection(db, "users", user.uid, "favorites");
    const unsubscribe = onSnapshot(favsRef, async (snapshot) => {
      const listingIds = snapshot.docs.map((doc) => doc.data().listingId);

      if (listingIds.length === 0) {
        setFavorites([]);
        setFavLoading(false);
        return;
      }

      // Fetch actual listing details
      const listings: Listing[] = [];
      for (const id of listingIds) {
        const lDoc = await getDoc(doc(db, "listings", id));
        if (lDoc.exists()) {
          listings.push({ id: lDoc.id, ...lDoc.data() } as Listing);
        }
      }
      setFavorites(listings);
      setFavLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, "rules"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setRules(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Rule),
        );
      },
      (error) => {
        console.error("Error fetching rules:", error);
      },
    );
    return () => unsubscribe();
  }, []);

  const handleToggleStatus = async (e: React.MouseEvent, listing: Listing) => {
    e.preventDefault();
    e.stopPropagation();
    const newStatus = listing.status === "active" ? "sold" : "active";
    try {
      await updateDoc(doc(db, "listings", listing.id), {
        status: newStatus,
      });
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const handleDeleteListing = async (e: React.MouseEvent, listing: Listing) => {
    e.preventDefault();
    e.stopPropagation();
    setListingToDelete(listing);
  };

  const confirmDeleteListing = async () => {
    if (!listingToDelete) return;
    setUpdating(true);
    try {
      await deleteDoc(doc(db, "listings", listingToDelete.id));
      setListingToDelete(null);
    } catch (error) {
      console.error("Error deleting listing:", error);
      alert("Failed to delete listing.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    setShowDeleteAccountConfirm(true);
  };

  const confirmDeleteAccount = async () => {
    if (!user) return;

    setShowDeleteAccountConfirm(false);
    setUpdating(true);
    try {
      const batch = writeBatch(db);

      // 1. Delete listings
      const listingsQuery = query(
        collection(db, "listings"),
        where("sellerId", "==", user.uid),
      );
      const listingsSnap = await getDocs(listingsQuery);
      listingsSnap.forEach((doc) => batch.delete(doc.ref));

      // 2. Delete chats where user is participant
      const chatsQuery = query(
        collection(db, "chats"),
        where("participants", "array-contains", user.uid),
      );
      const chatsSnap = await getDocs(chatsQuery);
      chatsSnap.forEach((doc) => batch.delete(doc.ref));

      // 3. Delete user document
      batch.delete(doc(db, "users", user.uid));

      await batch.commit();

      // 4. Delete Auth user
      await user.delete();

      alert("Account deleted successfully.");
      window.location.href = "/";
    } catch (error: any) {
      console.error("Error deleting account:", error);
      if (error.code === "auth/requires-recent-login") {
        alert(
          "This action requires recent login. Please log out and log back in to delete your account.",
        );
      } else {
        alert("Failed to delete account. Please try again later.");
      }
    } finally {
      setUpdating(false);
    }
  };

  if (!user) return null;

  const isOnlyAds =
    activeTab === "ads" &&
    new URLSearchParams(location.search).get("tab") === "ads";

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 md:pb-12 transition-colors duration-300">
      {/* Profile Header */}
      <Card
        className={cn(
          "border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300 rounded-[2rem] shadow-xl bg-white dark:bg-slate-900",
          isOnlyAds && "hidden md:block",
        )}
      >
        <div className="h-40 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 animate-gradient-xy" />
        <CardContent className="relative pt-16 pb-10 px-8">
          <div className="absolute -top-16 left-8 -mt-2 group">
            <div className="relative block transition-transform hover:scale-105 active:scale-95">
              <Avatar
                className={cn(
                  "w-32 h-32 border-8 border-white dark:border-slate-900 shadow-2xl transition-opacity group-hover:opacity-90",
                  updating && "opacity-50",
                )}
              >
                <AvatarImage
                  src={
                    profile?.photoURL && profile.photoURL !== "none"
                      ? profile.photoURL
                      : profile?.photoURL === "none"
                        ? undefined
                        : user?.photoURL || undefined
                  }
                />
                <AvatarFallback className="text-4xl font-black bg-blue-600 text-white">
                  {(profile?.displayName || user?.displayName || "U")[0]}
                </AvatarFallback>
                {updating && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full backdrop-blur-sm">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                  </div>
                )}
              </Avatar>
              <div
                className={cn(
                  "absolute inset-0 rounded-full flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm shadow-inner",
                  updating && "hidden",
                )}
              >
                <label
                  className="cursor-pointer w-full h-full flex flex-col items-center justify-center hover:bg-white/10 rounded-full transition-colors"
                  title="Change Photo"
                >
                  <Camera className="w-8 h-8 text-white mb-1" />
                  <span className="text-[10px] text-white font-black uppercase tracking-tighter text-center leading-none px-4">
                    Update Picture
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfileImageUpload}
                    disabled={updating}
                  />
                </label>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-4">
              <div>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
                  {profile?.displayName || user.displayName}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <Badge
                    variant="secondary"
                    className="px-3 py-1 bg-blue-600 text-white border-none font-black text-[10px] tracking-widest uppercase shadow-lg shadow-blue-500/20"
                  >
                    {profile?.role || "user"}
                  </Badge>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <p className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-tight">
                    {profile?.email || user.email}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                {profile?.mobile && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800">
                    <Phone className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      {profile.mobile}
                    </span>
                  </div>
                )}
                {profile?.address && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      {profile.address}
                    </span>
                  </div>
                )}
              </div>

              {profile?.bio && (
                <p className="text-slate-600 dark:text-slate-400 text-lg font-medium leading-relaxed max-w-2xl bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {profile.bio}
                </p>
              )}

              {profile?.referralCode && (
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 group cursor-pointer hover:scale-105 transition-transform active:scale-95">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="tracking-widest uppercase">
                    ID: {profile.referralCode}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger
                  render={
                    <Button
                      variant="outline"
                      className="h-12 px-6 rounded-2xl gap-2 font-black uppercase tracking-widest border-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                    >
                      <Settings className="w-4 h-4" /> Edit Profile
                    </Button>
                  }
                />
                <DialogContent className="sm:max-w-xl rounded-[2rem] bg-white dark:bg-slate-900 p-8 shadow-2xl border-slate-200 dark:border-slate-800">
                  <DialogHeader className="mb-6">
                    <DialogTitle className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                      <Settings className="w-8 h-8 text-blue-600" /> Profile
                      Settings
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                      Customize your presence in the Local Trade community
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto px-1 no-scrollbar">
                    <div className="space-y-2">
                      <Label
                        htmlFor="name"
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400"
                      >
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        value={newDisplayName}
                        onChange={(e) => setNewDisplayName(e.target.value)}
                        className="h-14 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-600 focus:ring-0 rounded-2xl font-bold transition-all px-5"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="email"
                          className="text-[10px] font-black uppercase tracking-widest text-slate-400"
                        >
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="h-14 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-600 focus:ring-0 rounded-2xl font-bold px-5"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="mobile"
                          className="text-[10px] font-black uppercase tracking-widest text-slate-400"
                        >
                          Phone Number
                        </Label>
                        <Input
                          id="mobile"
                          value={newMobile}
                          onChange={(e) => setNewMobile(e.target.value)}
                          className="h-14 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-600 focus:ring-0 rounded-2xl font-bold px-5"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="bio"
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400"
                      >
                        Biography
                      </Label>
                      <Input
                        id="bio"
                        value={newBio}
                        onChange={(e) => setNewBio(e.target.value)}
                        className="h-14 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-600 focus:ring-0 rounded-2xl font-bold px-5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="address"
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400"
                      >
                        Full Address
                      </Label>
                      <Input
                        id="address"
                        value={newAddress}
                        onChange={(e) => setNewAddress(e.target.value)}
                        className="h-14 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-600 focus:ring-0 rounded-2xl font-bold px-5"
                      />
                    </div>
                  </div>
                  <DialogFooter className="mt-8">
                    <Button
                      type="submit"
                      onClick={handleUpdateProfile}
                      disabled={updating}
                      className="h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 w-full active:scale-95 transition-all"
                    >
                      {updating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        "Commit Changes"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                onClick={logout}
                className="h-12 px-6 rounded-2xl gap-2 font-black uppercase tracking-widest text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              >
                <LogOut className="w-4 h-4" /> Logout
              </Button>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                  {myListings.length}
                </p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  Live Ads
                </p>
              </div>
              <div className="text-center border-l border-slate-100 dark:border-slate-800 pl-8">
                <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                  {favorites.length}
                </p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  Wishlist
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteAccount}
              className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 gap-2 font-bold uppercase text-[10px] tracking-widest"
            >
              <Trash2 className="w-3.5 h-3.5" /> Deactivate
            </Button>
          </div>
        </CardContent>
      </Card>

      <AdMobBanner placement="profile" className="my-0" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar Stats */}
        <div className={cn("space-y-4", isOnlyAds && "hidden md:block")}>
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div
                onClick={() => setActiveTab("ads")}
                className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-300 group ${
                  activeTab === "ads"
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-500/20 scale-[1.02]"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      activeTab === "ads"
                        ? "bg-white/20"
                        : "bg-blue-50 dark:bg-blue-900/20",
                    )}
                  >
                    <Package
                      className={cn(
                        "w-5 h-5",
                        activeTab === "ads" ? "text-white" : "text-blue-600",
                      )}
                    />
                  </div>
                  <span className="font-black uppercase tracking-widest text-xs">
                    Marketplace Ads
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    "font-black text-[10px]",
                    activeTab === "ads"
                      ? "bg-white/20 text-white border-none"
                      : "bg-slate-100 dark:bg-slate-800",
                  )}
                >
                  {myListings.length}
                </Badge>
              </div>
              <div
                onClick={() => setActiveTab("favorites")}
                className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-300 group ${
                  activeTab === "favorites"
                    ? "bg-red-500 text-white shadow-xl shadow-red-500/20 scale-[1.02]"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      activeTab === "favorites"
                        ? "bg-white/20"
                        : "bg-red-50 dark:bg-red-900/20",
                    )}
                  >
                    <Heart
                      className={cn(
                        "w-5 h-5",
                        activeTab === "favorites"
                          ? "text-white"
                          : "text-red-500",
                      )}
                    />
                  </div>
                  <span className="font-black uppercase tracking-widest text-xs">
                    Saved Items
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    "font-black text-[10px]",
                    activeTab === "favorites"
                      ? "bg-white/20 text-white border-none"
                      : "bg-slate-100 dark:bg-slate-800",
                  )}
                >
                  {favorites.length}
                </Badge>
              </div>
              <div
                onClick={() => setActiveTab("rules")}
                className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-300 group ${
                  activeTab === "rules"
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl scale-[1.02]"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      activeTab === "rules"
                        ? "bg-white/20 dark:bg-slate-900/20"
                        : "bg-slate-100 dark:bg-slate-800",
                    )}
                  >
                    <ShieldCheck
                      className={cn(
                        "w-5 h-5",
                        activeTab === "rules"
                          ? "text-white dark:text-slate-900"
                          : "text-slate-600",
                      )}
                    />
                  </div>
                  <span className="font-black uppercase tracking-widest text-xs">
                    Community Laws
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content: My Listings / Favorites / Rules */}
        <div className="md:col-span-2 space-y-8">
          <h2
            className={cn(
              "text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter",
              isOnlyAds && "hidden md:block",
            )}
          >
            {activeTab === "ads"
              ? "Portfolio"
              : activeTab === "favorites"
                ? "Wishlist"
                : "Standards"}
          </h2>

          <AnimatePresence mode="wait">
            {activeTab === "ads" ? (
              <motion.div
                key="ads"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 gap-6"
              >
                {loading ? (
                  <div className="space-y-6">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="h-40 bg-slate-100 dark:bg-slate-800/50 animate-pulse rounded-[2rem]"
                      />
                    ))}
                  </div>
                ) : myListings.length === 0 ? (
                  <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center gap-6">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-slate-300" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        Empty Inventory
                      </p>
                      <p className="text-slate-500 font-bold text-sm">
                        Start your selling journey today
                      </p>
                    </div>
                    <Link to="/create">
                      <Button className="bg-blue-600 hover:bg-blue-700 h-14 px-8 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20">
                        Create Ad
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {myListings.map((listing, index) => (
                      <React.Fragment key={listing.id}>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Link to={`/listing/${listing.id}`}>
                            <Card className="border-slate-100 dark:border-slate-800 hover:shadow-2xl hover:border-blue-500 dark:hover:border-blue-600 transition-all duration-500 overflow-hidden group bg-white dark:bg-slate-900 rounded-[2rem]">
                              <CardContent className="p-0 flex flex-col sm:flex-row h-auto sm:h-32">
                                <div className="w-full sm:w-32 h-32 sm:h-full overflow-hidden bg-slate-50 dark:bg-slate-800/50 relative shrink-0">
                                  <img
                                    src={
                                      listing.images?.[0] ||
                                      `https://picsum.photos/seed/${listing.id}/300/300`
                                    }
                                    className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute top-2 left-2">
                                    <Badge
                                      className={cn(
                                        "font-black text-[9px] tracking-widest uppercase border-none px-2 py-0.5 shadow-lg",
                                        listing.status === "sold"
                                          ? "bg-red-500 text-white"
                                          : "bg-emerald-500 text-white",
                                      )}
                                    >
                                      {listing.status}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex-1 p-4 md:p-5 flex flex-col justify-between">
                                  <div className="space-y-1 text-left">
                                    <div className="flex justify-between items-start">
                                      <h3 className="font-black text-lg text-slate-900 dark:text-white tracking-tight leading-none uppercase truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {listing.title}
                                      </h3>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={(e) =>
                                            handleToggleStatus(e, listing)
                                          }
                                          className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-400 hover:text-emerald-500 transition-all active:scale-90"
                                          title={
                                            listing.status === "active"
                                              ? "Mark as Sold"
                                              : "Mark as Active"
                                          }
                                        >
                                          <CheckCircle2 className="w-5 h-5" />
                                        </button>
                                        <button
                                          onClick={(e) =>
                                            handleDeleteListing(e, listing)
                                          }
                                          className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-all active:scale-90"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-black text-xl tracking-tighter">
                                      <span className="text-sm opacity-50">
                                        ₹
                                      </span>
                                      {listing.price.toLocaleString()}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-50 dark:border-slate-800/50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                                      {listing.category}
                                    </p>
                                    <div className="flex items-center gap-2 text-blue-600 font-black uppercase text-[10px] tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                      Edit Details{" "}
                                      <ChevronRight className="w-4 h-4" />
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        </motion.div>
                        {(index + 1) % 5 === 0 && (
                          <AdMobBanner
                            variant="horizontal"
                            placement="profile"
                            label="Promoted Content"
                            className="rounded-[2rem] my-0"
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : activeTab === "favorites" ? (
              <motion.div
                key="favorites"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {favLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="h-24 bg-slate-100 animate-pulse rounded-xl"
                      />
                    ))}
                  </div>
                ) : favorites.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                    <Heart className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500">
                      You haven't favorited any items yet.
                    </p>
                    <Link to="/">
                      <Button variant="outline" className="mt-4">
                        Browse Listings
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {favorites.map((listing) => (
                      <Link key={listing.id} to={`/listing/${listing.id}`}>
                        <Card className="border-slate-200 hover:shadow-xl hover:border-blue-200 transition-all duration-300 overflow-hidden group">
                          <CardContent className="p-0 flex h-28 sm:h-32">
                            <div className="w-28 sm:w-32 h-full overflow-hidden bg-slate-50 dark:bg-slate-800/50 relative shrink-0">
                              <img
                                src={
                                  listing.images?.[0] ||
                                  `https://picsum.photos/seed/${listing.id}/200/200`
                                }
                                className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                              <div>
                                <div className="flex justify-between items-start gap-2">
                                  <h3 className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                    {listing.title}
                                  </h3>
                                  <Badge
                                    variant={
                                      listing.status === "active"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className={
                                      listing.status === "sold"
                                        ? "bg-red-500 text-white"
                                        : ""
                                    }
                                  >
                                    {listing.status}
                                  </Badge>
                                </div>
                                <p className="text-xl font-bold text-blue-600 mt-1">
                                  ₹{listing.price.toLocaleString()}
                                </p>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-slate-400">
                                  Seller: {listing.sellerName}
                                </p>
                                <div className="flex items-center text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold">
                                  View Details{" "}
                                  <ChevronRight className="w-4 h-4" />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="rules"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <Card className="border-slate-200">
                  <CardContent className="p-6 space-y-6">
                    <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">
                          Marketplace Guidelines
                        </h3>
                        <p className="text-slate-500 text-sm">
                          Please follow these rules to keep our community safe
                          and trustworthy.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6 pt-2">
                      {rules.length > 0 ? (
                        rules.map((rule, idx) => (
                          <div key={rule.id} className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                              {rule.order || idx + 1}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900">
                                {rule.title}
                              </h4>
                              <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                                {rule.description}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="space-y-6">
                          <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                              1
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900">
                                Be Respectful
                              </h4>
                              <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                                Treat all members with respect. Harassment, hate
                                speech, or abusive language will not be
                                tolerated and will result in an immediate ban.
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                              2
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900">
                                No Prohibited Items
                              </h4>
                              <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                                Do not list illegal items, weapons, adult
                                content, counterfeit goods, or stolen property.
                                All listings must comply with local laws.
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                              3
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900">
                                Accurate Descriptions
                              </h4>
                              <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                                Provide honest and accurate descriptions of your
                                items. Disclose any flaws, damages, or missing
                                parts to avoid disputes.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {profile?.role === "admin" && (
                      <div className="pt-6 border-t border-slate-100 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Link to="/admin">
                          <Button className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg gap-2 shadow-lg shadow-blue-100">
                            <ShieldCheck className="w-5 h-5" />
                            Go to Admin Panel
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Account Management Guide */}
                <Card className="border-slate-200">
                  <CardContent className="p-6 space-y-6">
                    <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                        <HelpCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">
                          Account Management
                        </h3>
                        <p className="text-slate-500 text-sm">
                          Helpful tips for managing your account efficiently.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6 pt-2">
                      <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                        <div className="flex items-center gap-3 mb-4">
                          <MessageCircle className="w-5 h-5 text-blue-600" />
                          <h4 className="font-bold text-slate-900">
                            How to Delete a Chat
                          </h4>
                        </div>
                        <ol className="space-y-3">
                          <li className="flex gap-3 text-sm text-slate-600">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold shrink-0 mt-0.5">
                              1
                            </span>
                            <span>
                              Go to the chat you wish to delete from your
                              messages list.
                            </span>
                          </li>
                          <li className="flex gap-3 text-sm text-slate-600">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold shrink-0 mt-0.5">
                              2
                            </span>
                            <span>
                              Find the option to delete the chat in the chat
                              room's context menu.
                            </span>
                          </li>
                          <li className="flex gap-3 text-sm text-slate-600">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold shrink-0 mt-0.5">
                              3
                            </span>
                            <span>
                              Confirm and delete the chat permanently.
                            </span>
                          </li>
                        </ol>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                        <div className="flex items-center gap-3 mb-4">
                          <Package className="w-5 h-5 text-blue-600" />
                          <h4 className="font-bold text-slate-900">
                            How to Delete a Listing
                          </h4>
                        </div>
                        <ol className="space-y-3">
                          <li className="flex gap-3 text-sm text-slate-600">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold shrink-0 mt-0.5">
                              1
                            </span>
                            <span>
                              Go to your profile and select the "My Ads" tab.
                            </span>
                          </li>
                          <li className="flex gap-3 text-sm text-slate-600">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold shrink-0 mt-0.5">
                              2
                            </span>
                            <span>
                              Find the listing you want to remove and click the
                              trash can icon.
                            </span>
                          </li>
                          <li className="flex gap-3 text-sm text-slate-600">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold shrink-0 mt-0.5">
                              3
                            </span>
                            <span>Confirm the deletion in the popup box.</span>
                          </li>
                        </ol>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Dialog
        open={showDeleteAccountConfirm}
        onOpenChange={setShowDeleteAccountConfirm}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete your account? This action is
              irreversible. All your listings, chats, and profile data will be
              permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteAccountConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteAccount}
              disabled={updating}
            >
              {updating ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!listingToDelete}
        onOpenChange={(open) => !open && setListingToDelete(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Listing
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{listingToDelete?.title}"? This
              action cannot be undone and will also delete any associated chats.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setListingToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteListing}
              disabled={updating}
            >
              {updating ? "Deleting..." : "Delete Listing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="pt-8 pb-12 text-center">
        <Link
          to="/privacy-policy"
          className="text-sm text-slate-400 hover:text-blue-600 hover:underline transition-colors"
        >
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}
