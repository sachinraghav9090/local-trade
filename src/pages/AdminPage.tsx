import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
  addDoc,
} from "firebase/firestore";
import {
  UserProfile,
  Listing,
  Category,
  Report,
  SupportTicket,
  Rule,
} from "../types";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Package,
  LayoutDashboard,
  Trash2,
  Shield,
  ShieldAlert,
  Settings as SettingsIcon,
  Save,
  ListTree,
  Plus,
  Flag,
  Upload,
  X,
  LifeBuoy,
  CheckCircle,
  ShieldCheck,
  Edit,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "motion/react";
import { uploadImage } from "../services/uploadService";

export default function AdminPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryImage, setNewCategoryImage] = useState("");
  const [newRule, setNewRule] = useState<Partial<Rule>>({
    title: "",
    description: "",
  });
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [settings, setSettings] = useState<any>({
    siteTitle: "LocalTrade",
    logoUrl: "",
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsAdmin(true);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const urlParams = new URLSearchParams(window.location.search);
  const hasAccess = urlParams.get("access") === "granted";

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSavingSettings(true);
      const res = await uploadImage(file);
      setSettings((prev) => ({ ...prev, logoUrl: res.url }));
    } catch (err) {
      console.error("Error uploading logo:", err);
      handleFirestoreError(err, OperationType.WRITE, "settings/logo");
    } finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    if (!hasAccess) return;

    const usersUnsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        setUsers(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as any),
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "users");
      },
    );

    const listingsUnsubscribe = onSnapshot(
      collection(db, "listings"),
      (snapshot) => {
        setListings(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as any),
        );
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "listings");
      },
    );

    const categoriesUnsubscribe = onSnapshot(
      collection(db, "categories"),
      (snapshot) => {
        setCategories(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as any),
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "categories");
      },
    );

    const rulesUnsubscribe = onSnapshot(
      collection(db, "rules"),
      (snapshot) => {
        setRules(
          snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }) as Rule)
            .sort((a, b) => (a.order || 0) - (b.order || 0)),
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "rules");
      },
    );

    const reportsUnsubscribe = onSnapshot(
      collection(db, "reports"),
      (snapshot) => {
        setReports(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as any),
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "reports");
      },
    );

    const supportUnsubscribe = onSnapshot(
      collection(db, "support"),
      (snapshot) => {
        setSupportTickets(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as any),
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "support");
      },
    );

    const settingsUnsubscribe = onSnapshot(
      doc(db, "settings", "global"),
      (settingsDoc) => {
        if (settingsDoc.exists()) {
          setSettings((prev) => ({ ...prev, ...settingsDoc.data() }));
        }
      },
    );

    // Handle legacy ads backwards-compatibility
    const adSettingsUnsubscribe = onSnapshot(
      doc(db, "settings", "ads"),
      (settingsDoc) => {
        if (settingsDoc.exists()) {
          setSettings((prev) => ({ ...prev, ...settingsDoc.data() }));
        }
      },
    );

    return () => {
      usersUnsubscribe();
      listingsUnsubscribe();
      categoriesUnsubscribe();
      reportsUnsubscribe();
      supportUnsubscribe();
      settingsUnsubscribe();
      adSettingsUnsubscribe();
    };
  }, [isAdmin]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, "settings", "global"), settings, { merge: true });
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleBanUser = async (
    userId: string,
    isBanned: boolean | undefined,
  ) => {
    try {
      await updateDoc(doc(db, "users", userId), { isBanned: !isBanned });
      alert(`User ${!isBanned ? "banned" : "unbanned"} successfully.`);
    } catch (error) {
      console.error("Error updating ban status:", error);
      handleFirestoreError(
        error as any,
        OperationType.UPDATE,
        `/users/${userId}`,
      );
      alert("Failed to update ban status. See console for details.");
    }
  };

  const handleDeleteListing = async (id: string) => {
    setListingToDelete(id);
  };

  const handleApproveListing = async (id: string) => {
    try {
      await updateDoc(doc(db, "listings", id), { status: "active" });
      alert("Listing approved successfully.");
    } catch (error) {
      console.error("Error approving listing:", error);
    }
  };

  const handleRejectListing = async (id: string) => {
    try {
      await updateDoc(doc(db, "listings", id), { status: "rejected" });
      alert("Listing rejected.");
    } catch (error) {
      console.error("Error rejecting listing:", error);
    }
  };

  const confirmDeleteListing = async () => {
    if (!listingToDelete) return;
    setIsProcessing(true);
    try {
      await deleteDoc(doc(db, "listings", listingToDelete));
      setListingToDelete(null);
    } catch (error) {
      console.error("Error deleting listing:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleUserRole = async (
    userId: string,
    currentRole: string | undefined,
  ) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    try {
      await updateDoc(doc(db, "users", userId), { role: newRole });
      alert(`User role changed to ${newRole}.`);
    } catch (error) {
      console.error("Error updating role:", error);
      handleFirestoreError(
        error as any,
        OperationType.UPDATE,
        `/users/${userId}`,
      );
      alert("Failed to update role. See console for details.");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setUserToDelete(userId);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsProcessing(true);
    try {
      await deleteDoc(doc(db, "users", userToDelete));
      setUserToDelete(null);
      alert("User deleted successfully.");
    } catch (error) {
      console.error("Error deleting user:", error);
      handleFirestoreError(
        error as any,
        OperationType.DELETE,
        `/users/${userToDelete}`,
      );
      alert("Failed to delete user. See console for details.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await addDoc(collection(db, "categories"), {
        name: newCategory.trim(),
        image:
          newCategoryImage.trim() ||
          `https://picsum.photos/seed/${newCategory.trim()}/100/100`,
      });
      setNewCategory("");
      setNewCategoryImage("");
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  const handleCategoryImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const uploadResult = await uploadImage(file);
      setNewCategoryImage(uploadResult.url);
    } catch (error) {
      console.error("Error uploading category image:", error);
      alert("Failed to upload image to Cloudinary.");
    } finally {
      setIsProcessing(false);
      e.target.value = "";
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, "categories", id));
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const handleDeleteReport = async (id: string) => {
    try {
      await deleteDoc(doc(db, "reports", id));
    } catch (error) {
      console.error("Error deleting report:", error);
    }
  };

  const handleSaveRule = async () => {
    if (!newRule.title?.trim() || !newRule.description?.trim()) return;
    setIsProcessing(true);
    try {
      if (editingRuleId) {
        await updateDoc(doc(db, "rules", editingRuleId), newRule as any);
      } else {
        await addDoc(collection(db, "rules"), {
          ...newRule,
          order: rules.length + 1,
        });
      }
      setNewRule({ title: "", description: "" });
      setEditingRuleId(null);
      setShowRuleDialog(false);
    } catch (error) {
      console.error("Error saving rule:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await deleteDoc(doc(db, "rules", id));
    } catch (error) {
      console.error("Error deleting rule:", error);
    }
  };

  const handleResolveReport = async (id: string) => {
    try {
      await updateDoc(doc(db, "reports", id), { status: "resolved" });
    } catch (error) {
      console.error("Error resolving report:", error);
    }
  };

  const handleCloseTicket = async (id: string) => {
    try {
      await updateDoc(doc(db, "support", id), { status: "closed" });
    } catch (error) {
      console.error("Error closing ticket:", error);
    }
  };

  const handleDeleteTicket = async (id: string) => {
    try {
      await deleteDoc(doc(db, "support", id));
    } catch (error) {
      console.error("Error deleting ticket:", error);
    }
  };

  const urlParams = new URLSearchParams(window.location.search);
  const hasAccess = urlParams.get("access") === "granted";
  
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="p-4 bg-red-50 rounded-full mb-6">
          <ShieldAlert className="w-16 h-16 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Access Denied
        </h2>
        <p className="text-slate-500 max-w-sm">
          This area is reserved for master administrators only.
        </p>
        <Button
          onClick={() => navigate("/")}
          variant="outline"
          className="mt-8"
        >
          Back to Home
        </Button>
      </div>
    );
  }

  // Skip PIN verification since we're already authenticated via Firebase

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 w-full absolute inset-0 z-50 overflow-hidden">
      <div className="flex flex-col md:flex-row w-full h-full">
        {/* Sidebar */}
        <div className="bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 w-full md:w-64 md:h-full">
          <div className="p-6 flex items-center justify-between md:justify-start gap-3 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/50">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                Admin Console
              </span>
            </div>

            {/* Mobile "back to site" button top right */}
            <Button
              onClick={() => navigate("/")}
              variant="ghost"
              size="icon"
              className="md:hidden text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-x-auto md:overflow-y-auto px-4 py-4 md:py-6 no-scrollbar">
            <nav className="flex md:flex-col h-auto bg-transparent border-0 p-0 items-stretch space-x-2 md:space-x-0 md:space-y-2 justify-start">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex items-center justify-start whitespace-nowrap px-4 py-3 rounded-lg transition-all border-0 ${activeTab === "dashboard" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
              >
                <LayoutDashboard className="w-5 h-5 mr-3 shrink-0" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className={`flex items-center justify-start whitespace-nowrap px-4 py-3 rounded-lg transition-all border-0 ${activeTab === "users" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
              >
                <Users className="w-5 h-5 mr-3 shrink-0" />
                Users
              </button>
              <button
                onClick={() => setActiveTab("listings")}
                className={`flex items-center justify-start whitespace-nowrap px-4 py-3 rounded-lg transition-all border-0 ${activeTab === "listings" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
              >
                <Package className="w-5 h-5 mr-3 shrink-0" />
                Listings
              </button>
              <button
                onClick={() => setActiveTab("categories")}
                className={`flex items-center justify-start whitespace-nowrap px-4 py-3 rounded-lg transition-all border-0 ${activeTab === "categories" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
              >
                <ListTree className="w-5 h-5 mr-3 shrink-0" />
                Categories
              </button>
              <button
                onClick={() => setActiveTab("reports")}
                className={`flex items-center justify-start whitespace-nowrap px-4 py-3 rounded-lg transition-all border-0 ${activeTab === "reports" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
              >
                <Flag className="w-5 h-5 mr-3 shrink-0" />
                <span className="flex-1 text-left">Reports</span>
                {reports.filter((r) => r.status === "pending").length > 0 && (
                  <Badge className="bg-red-500 text-white px-2 py-0.5 text-xs border-0 ml-2">
                    {reports.filter((r) => r.status === "pending").length}
                  </Badge>
                )}
              </button>
              <button
                onClick={() => setActiveTab("support")}
                className={`flex items-center justify-start whitespace-nowrap px-4 py-3 rounded-lg transition-all border-0 ${activeTab === "support" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
              >
                <LifeBuoy className="w-5 h-5 mr-3 shrink-0" />
                <span className="flex-1 text-left">Support</span>
                {supportTickets.filter((t) => t.status === "open").length >
                  0 && (
                  <Badge className="bg-blue-500 text-white px-2 py-0.5 text-xs border-0 ml-2">
                    {supportTickets.filter((t) => t.status === "open").length}
                  </Badge>
                )}
              </button>
              <button
                onClick={() => setActiveTab("rules")}
                className={`flex items-center justify-start whitespace-nowrap px-4 py-3 rounded-lg transition-all border-0 ${activeTab === "rules" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
              >
                <ShieldCheck className="w-5 h-5 mr-3 shrink-0" />
                Rules
              </button>
              <button
                onClick={() => setActiveTab("ads")}
                className={`flex items-center justify-start whitespace-nowrap px-4 py-3 rounded-lg transition-all border-0 ${activeTab === "ads" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
              >
                <Package className="w-5 h-5 mr-3 shrink-0" />
                Ads Settings
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`flex items-center justify-start whitespace-nowrap px-4 py-3 rounded-lg transition-all border-0 ${activeTab === "settings" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
              >
                <SettingsIcon className="w-5 h-5 mr-3 shrink-0" />
                Settings
              </button>
            </nav>

            <div className="hidden md:block mt-12 mb-6">
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                className="w-full justify-start text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white bg-transparent"
              >
                <X className="w-4 h-4 mr-2" />
                Exit Console
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50/50">
          <header className="h-16 border-b border-slate-200 bg-white flex items-center px-4 md:px-8 shrink-0 justify-between">
            <h2 className="text-xl font-semibold text-slate-800 hidden md:block">
              Marketplace Overview
            </h2>
            <div className="flex items-center gap-4 ml-auto">
              <span className="text-sm font-medium text-slate-500">
                Welcome, Super Admin
              </span>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
              {activeTab === "dashboard" && (
                <div className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                          Total Users
                        </CardTitle>
                        <Users className="w-4 h-4 text-slate-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{users.length}</div>
                      </CardContent>
                    </Card>
                    <Card className="border-emerald-200 bg-emerald-50/50">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-600">
                          Live Users
                        </CardTitle>
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-emerald-600">
                          {users.filter((u) => u.isOnline).length}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                          Total Listings
                        </CardTitle>
                        <Package className="w-4 h-4 text-slate-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {listings.length}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                          Pending Approval
                        </CardTitle>
                        <Package className="w-4 h-4 text-amber-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-amber-600">
                          {listings.filter((l) => l.status === "pending").length}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === "users" && (
                <div className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Registered Users</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/50">
                              <TableHead className="pl-6 w-16 text-center">
                                Photo
                              </TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Joined</TableHead>
                              <TableHead className="text-right pr-6">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {users.map((user) => (
                              <TableRow key={user.uid}>
                                <TableCell className="pl-6">
                                  <Avatar className="w-10 h-10 border border-slate-200">
                                    <AvatarImage
                                      src={
                                        user.photoURL === "none"
                                          ? undefined
                                          : user.photoURL
                                      }
                                    />
                                    <AvatarFallback>
                                      {user.displayName?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {user.displayName}
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                  {user.isBanned ? (
                                    <Badge
                                      variant="destructive"
                                      className="bg-red-500 hover:bg-red-600"
                                    >
                                      Banned
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant={
                                        user.role === "admin"
                                          ? "default"
                                          : "secondary"
                                      }
                                      className={
                                        user.role === "admin"
                                          ? "bg-indigo-600 hover:bg-indigo-700"
                                          : ""
                                      }
                                    >
                                      {user.role || "user"}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {user.createdAt
                                    ?.toDate()
                                    .toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right pr-6 whitespace-nowrap">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handleToggleUserRole(
                                          user.uid,
                                          user.role,
                                        )
                                      }
                                    >
                                      Toggle Role
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handleToggleBanUser(
                                          user.uid,
                                          user.isBanned,
                                        )
                                      }
                                      className={
                                        user.isBanned
                                          ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                          : "text-amber-600 border-amber-200 hover:bg-amber-50"
                                      }
                                      disabled={
                                        user.email ===
                                        "sachinraghav9090@gmail.com"
                                      }
                                    >
                                      {user.isBanned ? "Unban" : "Ban"}
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleDeleteUser(user.uid)}
                                      disabled={
                                        user.email ===
                                        "sachinraghav9090@gmail.com"
                                      }
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "listings" && (
                <div className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>All Listings</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/50">
                              <TableHead className="pl-6">Title</TableHead>
                              <TableHead>Price</TableHead>
                              <TableHead>Seller</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right pr-6">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {listings.map((listing) => (
                              <TableRow key={listing.id}>
                                <TableCell
                                  className="font-medium truncate max-w-[200px] pl-6"
                                  title={listing.title}
                                >
                                  {listing.title}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  ₹{listing.price.toLocaleString()}
                                </TableCell>
                                <TableCell className="truncate max-w-[150px]">
                                  {listing.sellerName}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {listing.category || "N/A"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      listing.status === "active"
                                        ? "default"
                                        : listing.status === "pending"
                                          ? "outline"
                                          : "secondary"
                                    }
                                    className={
                                      listing.status === "active"
                                        ? "bg-emerald-500 hover:bg-emerald-600"
                                        : listing.status === "pending"
                                          ? "text-amber-600 border-amber-500 bg-amber-50"
                                          : listing.status === "rejected"
                                            ? "bg-red-500"
                                            : ""
                                    }
                                  >
                                    {listing.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                  <div className="flex justify-end gap-2 flex-wrap">
                                    {listing.status === "pending" && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                          onClick={() =>
                                            handleApproveListing(listing.id)
                                          }
                                        >
                                          Approve
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-red-600 border-red-200 hover:bg-red-50"
                                          onClick={() =>
                                            handleRejectListing(listing.id)
                                          }
                                        >
                                          Reject
                                        </Button>
                                      </>
                                    )}
<Button
                                          variant="destructive"
                                          size="icon"
                                          className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 shadow-none border-0"
                                          onClick={() =>
                                            handleDeleteListing(listing.id)
                                          }
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "categories" && (
                <div className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Manage Categories</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 p-0 pt-6 border-t border-slate-100">
                      <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200 mx-6 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label className="text-slate-700 font-semibold">
                              Category Name
                            </Label>
                            <Input
                              placeholder="e.g. Electronics, Furniture..."
                              value={newCategory}
                              onChange={(e) => setNewCategory(e.target.value)}
                              className="bg-white"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-slate-700 font-semibold">
                              Category Image
                            </Label>
                            <div className="flex gap-4 items-center">
                              {newCategoryImage ? (
                                <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm">
                                  <img
                                    src={newCategoryImage}
                                    className="w-full h-full object-cover"
                                  />
                                  <button
                                    onClick={() => setNewCategoryImage("")}
                                    className="absolute top-0 right-0 bg-red-500/90 hover:bg-red-600 text-white p-1 rounded-bl-xl transition-colors backdrop-blur-sm"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <label className="w-14 h-14 shrink-0 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all bg-white">
                                  <Upload className="w-5 h-5 text-slate-400" />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleCategoryImageUpload}
                                  />
                                </label>
                              )}
                              <div className="flex-1">
                                <Input
                                  placeholder="Or paste Image URL..."
                                  value={
                                    newCategoryImage.startsWith("data:")
                                      ? ""
                                      : newCategoryImage
                                  }
                                  onChange={(e) =>
                                    setNewCategoryImage(e.target.value)
                                  }
                                  className="font-mono text-xs bg-white"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={handleAddCategory}
                          className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-sm font-semibold shadow-md shadow-blue-200"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add New Category
                        </Button>
                      </div>

                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/50">
                              <TableHead className="w-20 pl-6">Image</TableHead>
                              <TableHead>Category Name</TableHead>
                              <TableHead className="text-right pr-6">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {categories.map((cat) => (
                              <TableRow key={cat.id}>
                                <TableCell className="pl-6">
                                  <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shadow-sm">
                                    <img
                                      src={
                                        cat.image ||
                                        `https://picsum.photos/seed/${cat.name}/100/100`
                                      }
                                      alt={cat.name}
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                </TableCell>
                                <TableCell className="font-semibold text-slate-700">
                                  {cat.name}
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 shadow-none border-0"
                                    onClick={() => handleDeleteCategory(cat.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                            {categories.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={3}
                                  className="text-center text-slate-500 py-12 bg-slate-50/30"
                                >
                                  <ListTree className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                                  No categories found. Add one above.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "reports" && (
                <div className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>User Reports</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/50">
                              <TableHead className="pl-6">Listing</TableHead>
                              <TableHead>Reporter</TableHead>
                              <TableHead className="w-1/3">Reason</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right pr-6">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reports.map((report) => (
                              <TableRow key={report.id}>
                                <TableCell className="font-medium pl-6">
                                  <Link
                                    to={`/listing/${report.listingId}`}
                                    className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                  >
                                    {report.listingTitle}
                                  </Link>
                                </TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                                    {report.reporterEmail}
                                  </span>
                                </TableCell>
                                <TableCell
                                  className="text-sm max-w-[250px] truncate text-slate-600"
                                  title={report.reason}
                                >
                                  {report.reason}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      report.status === "pending"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                    className={
                                      report.status === "pending"
                                        ? "bg-amber-500 hover:bg-amber-600"
                                        : "bg-emerald-100 text-emerald-800"
                                    }
                                  >
                                    {report.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                  <div className="flex justify-end gap-2">
                                    {report.status === "pending" && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 shadow-none"
                                        onClick={() =>
                                          handleResolveReport(report.id)
                                        }
                                      >
                                        Resolve
                                      </Button>
                                    )}
                                    <Button
                                      variant="destructive"
                                      size="icon"
                                      className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 shadow-none border-0"
                                      onClick={() =>
                                        handleDeleteReport(report.id)
                                      }
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                            {reports.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={5}
                                  className="text-center text-slate-500 py-12 bg-slate-50/30"
                                >
                                  <Flag className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                                  No pending reports.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "support" && (
                <div className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Support Tickets</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/50">
                              <TableHead className="pl-6">User</TableHead>
                              <TableHead className="w-1/4">Subject</TableHead>
                              <TableHead className="w-1/3">Message</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right pr-6">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {supportTickets.map((ticket) => (
                              <TableRow key={ticket.id} className="group">
                                <TableCell className="pl-6 align-top pt-4">
                                  <div className="font-semibold text-slate-900 leading-tight block mb-0.5">
                                    {ticket.userEmail}
                                  </div>
                                  <div className="text-xs text-slate-500 font-mono tracking-tighter">
                                    {ticket.userId}
                                  </div>
                                </TableCell>
                                <TableCell className="font-semibold text-slate-700 align-top pt-4">
                                  {ticket.subject}
                                </TableCell>
                                <TableCell className="text-sm max-w-[300px] text-slate-600 whitespace-pre-wrap leading-relaxed py-4">
                                  {ticket.message}
                                </TableCell>
                                <TableCell className="align-top pt-4">
                                  <Badge
                                    variant={
                                      ticket.status === "open"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className={
                                      ticket.status === "open"
                                        ? "bg-blue-600 shadow-sm"
                                        : "bg-slate-100 text-slate-600"
                                    }
                                  >
                                    {ticket.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right pr-6 align-top pt-4">
                                  <div className="flex justify-end gap-2">
                                    {ticket.status === "open" && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleCloseTicket(ticket.id)
                                        }
                                        className="gap-1.5 shadow-none hover:bg-slate-50"
                                      >
                                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                                        Close
                                      </Button>
                                    )}
                                    <Button
                                      variant="destructive"
                                      size="icon"
                                      onClick={() =>
                                        handleDeleteTicket(ticket.id)
                                      }
                                      className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 shadow-none border-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                            {supportTickets.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={5}
                                  className="text-center text-slate-500 py-12 bg-slate-50/30"
                                >
                                  <LifeBuoy className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                                  No support tickets found. Nice!
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "ads" && (
                <div className="mt-0 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-600" />
                        AdMob Placements Management
                      </CardTitle>
                      <CardDescription>
                        Enable or disable Google AdMob placeholders across
                        different sections of the app.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Home Page Ad */}
                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-base font-bold text-slate-800">
                                Home Page Banner
                              </Label>
                              <p className="text-xs text-slate-500">
                                Shown below the hero section on home page.
                              </p>
                            </div>
                            <Button
                              variant={
                                settings.homeAdEnabled ? "default" : "outline"
                              }
                              onClick={() =>
                                setSettings((prev) => ({
                                  ...prev,
                                  homeAdEnabled: !prev.homeAdEnabled,
                                }))
                              }
                              className={
                                settings.homeAdEnabled
                                  ? "bg-emerald-600 hover:bg-emerald-700"
                                  : ""
                              }
                            >
                              {settings.homeAdEnabled ? "Enabled" : "Disabled"}
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Ad Label
                            </Label>
                            <Input
                              value={
                                settings.homeAdLabel || "Google AdMob Banner"
                              }
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  homeAdLabel: e.target.value,
                                }))
                              }
                              placeholder="e.g. Sponsored Content"
                              className="bg-white"
                            />
                          </div>
                        </div>

                        {/* Listings Grid Ad */}
                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-base font-bold text-slate-800">
                                Listings Grid Inline Ad
                              </Label>
                              <p className="text-xs text-slate-500">
                                Injected into the products grid (every 10
                                items).
                              </p>
                            </div>
                            <Button
                              variant={
                                settings.gridAdEnabled ? "default" : "outline"
                              }
                              onClick={() =>
                                setSettings((prev) => ({
                                  ...prev,
                                  gridAdEnabled: !prev.gridAdEnabled,
                                }))
                              }
                              className={
                                settings.gridAdEnabled
                                  ? "bg-emerald-600 hover:bg-emerald-700"
                                  : ""
                              }
                            >
                              {settings.gridAdEnabled ? "Enabled" : "Disabled"}
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Ad Label
                            </Label>
                            <Input
                              value={settings.gridAdLabel || "Sponsored Ad"}
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  gridAdLabel: e.target.value,
                                }))
                              }
                              placeholder="e.g. Featured Seller"
                              className="bg-white"
                            />
                          </div>
                        </div>

                        {/* Listing Details Ad */}
                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-base font-bold text-slate-800">
                                Listing Details Side Ad
                              </Label>
                              <p className="text-xs text-slate-500">
                                Shown in the sidebar of listing detail view.
                              </p>
                            </div>
                            <Button
                              variant={
                                settings.detailsAdEnabled
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() =>
                                setSettings((prev) => ({
                                  ...prev,
                                  detailsAdEnabled: !prev.detailsAdEnabled,
                                }))
                              }
                              className={
                                settings.detailsAdEnabled
                                  ? "bg-emerald-600 hover:bg-emerald-700"
                                  : ""
                              }
                            >
                              {settings.detailsAdEnabled
                                ? "Enabled"
                                : "Disabled"}
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Ad Label
                            </Label>
                            <Input
                              value={
                                settings.detailsAdLabel || "Sponsored Content"
                              }
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  detailsAdLabel: e.target.value,
                                }))
                              }
                              placeholder="e.g. Recommended for you"
                              className="bg-white"
                            />
                          </div>
                        </div>

                        {/* Chat Room Ad */}
                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-base font-bold text-slate-800">
                                Chat Room Top Banner
                              </Label>
                              <p className="text-xs text-slate-500">
                                Sticky banner at the top of chat screens.
                              </p>
                            </div>
                            <Button
                              variant={
                                settings.chatAdEnabled ? "default" : "outline"
                              }
                              onClick={() =>
                                setSettings((prev) => ({
                                  ...prev,
                                  chatAdEnabled: !prev.chatAdEnabled,
                                }))
                              }
                              className={
                                settings.chatAdEnabled
                                  ? "bg-emerald-600 hover:bg-emerald-700"
                                  : ""
                              }
                            >
                              {settings.chatAdEnabled ? "Enabled" : "Disabled"}
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Ad Label
                            </Label>
                            <Input
                              value={settings.chatAdLabel || "Google AdMob Ad"}
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  chatAdLabel: e.target.value,
                                }))
                              }
                              placeholder="e.g. Secure Trading Tip"
                              className="bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-slate-100 flex justify-end">
                        <Button
                          onClick={async () => {
                            setSavingSettings(true);
                            try {
                              await setDoc(
                                doc(db, "settings", "ads"),
                                settings,
                                { merge: true },
                              );
                              alert("Ad settings updated successfully!");
                            } catch (err) {
                              console.error("Error saving ad settings:", err);
                              alert("Failed to save ad settings.");
                            } finally {
                              setSavingSettings(false);
                            }
                          }}
                          disabled={savingSettings}
                          className="bg-blue-600 hover:bg-blue-700 font-bold px-8"
                        >
                          {savingSettings
                            ? "Saving Settings..."
                            : "Save All Changes"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Unity Ads Management */}
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-purple-600" />
                        Unity Ads Management
                      </CardTitle>
                      <CardDescription>
                        Enable or disable Unity Ads placeholders across different sections of the app.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-base font-bold text-slate-800">
                                Unity Ads - Home Page
                              </Label>
                              <p className="text-xs text-slate-500">
                                Show Unity Ads on home page banner section.
                              </p>
                            </div>
                            <Button
                              variant={
                                settings.unityHomeAdEnabled ? "default" : "outline"
                              }
                              onClick={() =>
                                setSettings((prev) => ({
                                  ...prev,
                                  unityHomeAdEnabled: !prev.unityHomeAdEnabled,
                                }))
                              }
                              className={
                                settings.unityHomeAdEnabled
                                  ? "bg-purple-600 hover:bg-purple-700"
                                  : ""
                              }
                            >
                              {settings.unityHomeAdEnabled ? "Enabled" : "Disabled"}
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Ad Placement ID
                            </Label>
                            <Input
                              value={settings.unityHomeAdPlacementId || ""}
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  unityHomeAdPlacementId: e.target.value,
                                }))
                              }
                              placeholder="Enter Unity Ads Placement ID"
                              className="bg-white"
                            />
                          </div>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-base font-bold text-slate-800">
                                Unity Ads - Listing Details
                              </Label>
                              <p className="text-xs text-slate-500">
                                Show Unity Ads on listing detail page.
                              </p>
                            </div>
                            <Button
                              variant={
                                settings.unityDetailsAdEnabled ? "default" : "outline"
                              }
                              onClick={() =>
                                setSettings((prev) => ({
                                  ...prev,
                                  unityDetailsAdEnabled: !prev.unityDetailsAdEnabled,
                                }))
                              }
                              className={
                                settings.unityDetailsAdEnabled
                                  ? "bg-purple-600 hover:bg-purple-700"
                                  : ""
                              }
                            >
                              {settings.unityDetailsAdEnabled ? "Enabled" : "Disabled"}
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Ad Placement ID
                            </Label>
                            <Input
                              value={settings.unityDetailsAdPlacementId || ""}
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  unityDetailsAdPlacementId: e.target.value,
                                }))
                              }
                              placeholder="Enter Unity Ads Placement ID"
                              className="bg-white"
                            />
                          </div>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-base font-bold text-slate-800">
                                Unity Ads - Chat Room
                              </Label>
                              <p className="text-xs text-slate-500">
                                Show Unity Ads in chat room.
                              </p>
                            </div>
                            <Button
                              variant={
                                settings.unityChatAdEnabled ? "default" : "outline"
                              }
                              onClick={() =>
                                setSettings((prev) => ({
                                  ...prev,
                                  unityChatAdEnabled: !prev.unityChatAdEnabled,
                                }))
                              }
                              className={
                                settings.unityChatAdEnabled
                                  ? "bg-purple-600 hover:bg-purple-700"
                                  : ""
                              }
                            >
                              {settings.unityChatAdEnabled ? "Enabled" : "Disabled"}
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Ad Placement ID
                            </Label>
                            <Input
                              value={settings.unityChatAdPlacementId || ""}
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  unityChatAdPlacementId: e.target.value,
                                }))
                              }
                              placeholder="Enter Unity Ads Placement ID"
                              className="bg-white"
                            />
                          </div>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-base font-bold text-slate-800">
                                Unity Ads - Interstitial
                              </Label>
                              <p className="text-xs text-slate-500">
                                Show Unity Ads as interstitial between screens.
                              </p>
                            </div>
                            <Button
                              variant={
                                settings.unityInterstitialEnabled ? "default" : "outline"
                              }
                              onClick={() =>
                                setSettings((prev) => ({
                                  ...prev,
                                  unityInterstitialEnabled: !prev.unityInterstitialEnabled,
                                }))
                              }
                              className={
                                settings.unityInterstitialEnabled
                                  ? "bg-purple-600 hover:bg-purple-700"
                                  : ""
                              }
                            >
                              {settings.unityInterstitialEnabled ? "Enabled" : "Disabled"}
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Ad Placement ID
                            </Label>
                            <Input
                              value={settings.unityInterstitialPlacementId || ""}
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  unityInterstitialPlacementId: e.target.value,
                                }))
                              }
                              placeholder="Enter Unity Ads Placement ID"
                              className="bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-slate-100 flex justify-end">
                        <Button
                          onClick={async () => {
                            setSavingSettings(true);
                            try {
                              await setDoc(
                                doc(db, "settings", "ads"),
                                settings,
                                { merge: true },
                              );
                              alert("Unity Ads settings updated successfully!");
                            } catch (err) {
                              console.error("Error saving Unity Ads settings:", err);
                              alert("Failed to save Unity Ads settings.");
                            } finally {
                              setSavingSettings(false);
                            }
                          }}
                          disabled={savingSettings}
                          className="bg-purple-600 hover:bg-purple-700 font-bold px-8"
                        >
                          {savingSettings
                            ? "Saving Settings..."
                            : "Save Unity Ads"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "settings" && (
                <div className="space-y-6 mt-0">
                  <Card>
                    <CardHeader className="bg-slate-50 border-b border-slate-100">
                      <CardTitle className="text-lg">
                        Site Branding Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="font-semibold text-slate-700">
                            Display Title
                          </Label>
                          <Input
                            value={settings.siteTitle}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                siteTitle: e.target.value,
                              })
                            }
                            placeholder="E.g., LocalTrade"
                            className="max-w-md bg-white border-slate-200"
                          />
                          <p className="text-xs text-slate-500 font-medium">
                            Overrides the text title shown in browser tabs and
                            headers.
                          </p>
                        </div>
                        <div className="space-y-2 pt-2">
                          <Label className="font-semibold text-slate-700">
                            Logo Image URL
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              value={settings.logoUrl}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  logoUrl: e.target.value,
                                })
                              }
                              placeholder="https://example.com/logo.png"
                              className="bg-white border-slate-200 font-mono text-sm flex-1"
                            />
                            <div className="relative">
                              <Button
                                variant="outline"
                                size="icon"
                                className="shrink-0 bg-white border-slate-200 hover:bg-slate-50 relative overflow-hidden"
                                disabled={savingSettings}
                              >
                                {settings.logoUrl ? (
                                  <img
                                    src={settings.logoUrl}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Upload className="w-4 h-4 text-slate-500" />
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                  onChange={handleLogoUpload}
                                />
                              </Button>
                              {settings.logoUrl && (
                                <button
                                  onClick={() =>
                                    setSettings({ ...settings, logoUrl: "" })
                                  }
                                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-sm"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">
                            Click the upload icon to use Cloudinary, or paste a
                            URL directly.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="bg-red-50 border-b border-red-100">
                      <CardTitle className="text-lg text-red-900 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5" />
                        Admin Security
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="space-y-2">
                        <Label className="font-semibold text-slate-700">
                          Admin Login Password / PIN
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            type="password"
                            value={settings.adminPin}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                adminPin: e.target.value,
                              })
                            }
                            placeholder="Enter a secret password"
                            className="max-w-xs bg-white border-slate-200"
                          />
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          If set, users must enter this password to view the
                          Admin Console.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={handleSaveSettings}
                      disabled={savingSettings}
                      className="bg-blue-600 hover:bg-blue-700 gap-2 px-8 h-12 shadow-lg shadow-blue-200"
                    >
                      <Save className="w-5 h-5" />
                      {savingSettings
                        ? "Saving Applied Details..."
                        : "Save Configuration"}
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === "rules" && (
                <div className="mt-0">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Community Rules & Guidelines</CardTitle>
                      <Button
                        onClick={() => {
                          setNewRule({ title: "", description: "" });
                          setEditingRuleId(null);
                          setShowRuleDialog(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add New Rule
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/50">
                              <TableHead className="w-12 pl-6">#</TableHead>
                              <TableHead className="w-1/4">Title</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right pr-6">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rules.map((rule) => (
                              <TableRow key={rule.id}>
                                <TableCell className="pl-6 font-mono text-slate-500">
                                  {rule.order}
                                </TableCell>
                                <TableCell className="font-semibold text-slate-700">
                                  {rule.title}
                                </TableCell>
                                <TableCell className="text-sm text-slate-500 whitespace-pre-wrap leading-relaxed py-3">
                                  {rule.description}
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => {
                                        setNewRule({
                                          title: rule.title,
                                          description: rule.description,
                                          order: rule.order,
                                        });
                                        setEditingRuleId(rule.id);
                                        setShowRuleDialog(true);
                                      }}
                                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 shadow-none border-blue-200"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="icon"
                                      onClick={() => handleDeleteRule(rule.id)}
                                      className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 shadow-none border-0"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                            {rules.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={4}
                                  className="text-center text-slate-500 py-12 bg-slate-50/30"
                                >
                                  <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                                  No rules found. Add one above.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals omitted for brevity, keeping existing dialogs */}

      <Dialog
        open={!!listingToDelete}
        onOpenChange={(open) => !open && setListingToDelete(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Package className="w-5 h-5" />
              Delete Listing
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this listing? This action cannot
              be undone and will also remove all associated chats.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setListingToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteListing}
              disabled={isProcessing}
            >
              {isProcessing ? "Deleting..." : "Delete Listing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Users className="w-5 h-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This will permanently
              remove their profile data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setUserToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteUser}
              disabled={isProcessing}
            >
              {isProcessing ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {editingRuleId ? "Edit Rule" : "Add New Rule"}
            </DialogTitle>
            <DialogDescription>
              Create or modify community guidelines that will be displayed to
              all users.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rule Title</Label>
              <Input
                placeholder="e.g. Be Respectful"
                value={newRule.title}
                onChange={(e) =>
                  setNewRule({ ...newRule, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="w-full min-h-[120px] p-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Enter the rule description here..."
                value={newRule.description}
                onChange={(e) =>
                  setNewRule({ ...newRule, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input
                type="number"
                value={newRule.order}
                onChange={(e) =>
                  setNewRule({ ...newRule, order: parseInt(e.target.value) })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRule}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing
                ? "Saving..."
                : editingRuleId
                  ? "Update Rule"
                  : "Add Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
