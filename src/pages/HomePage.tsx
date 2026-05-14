import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  doc,
  getDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  getDocs,
  addDoc,
} from "firebase/firestore";
import { Listing, Category } from "../types";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  MapPin,
  Clock,
  Heart,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Zap,
  ChevronRight,
  Shield,
  SlidersHorizontal,
  ArrowUpDown,
  Search,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import AdMobBanner from "../components/AdMobBanner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [categories, setCategories] = useState<Partial<Category>[]>([
    { name: "All" },
  ]);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "price-low" | "price-high">(
    "newest",
  );
  const [locationFilter, setLocationFilter] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "categories"),
      (snapshot) => {
        const cats = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name as string,
          image: doc.data().image as string,
        }));
        setCategories([{ name: "All" }, ...cats]);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "categories");
      },
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let q = query(collection(db, "listings"), orderBy("createdAt", "desc"));

    if (category !== "All") {
      q = query(
        collection(db, "listings"),
        where("category", "==", category),
        orderBy("createdAt", "desc"),
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let docs = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Listing,
        );

        // Client-side filtering for complex search
        if (searchQuery) {
          const lowerQuery = searchQuery.toLowerCase();
          docs = docs.filter(
            (item) =>
              item.title.toLowerCase().includes(lowerQuery) ||
              item.description?.toLowerCase().includes(lowerQuery) ||
              item.category?.toLowerCase().includes(lowerQuery),
          );
        }

        // Price Filtering
        if (minPrice) {
          docs = docs.filter((item) => item.price >= Number(minPrice));
        }
        if (maxPrice) {
          docs = docs.filter((item) => item.price <= Number(maxPrice));
        }

        // Location Filtering
        if (locationFilter) {
          const lowerLoc = locationFilter.toLowerCase();
          docs = docs.filter((item) =>
            item.location?.toLowerCase().includes(lowerLoc),
          );
        }

        // Sorting
        if (sortBy === "price-low") {
          docs = docs.sort((a, b) => a.price - b.price);
        } else if (sortBy === "price-high") {
          docs = docs.sort((a, b) => b.price - a.price);
        } else {
          // Newest is handled by Firestore query naturally, but we can re-sort if needed after client filters
          docs = docs.sort(
            (a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis(),
          );
        }

        setListings(docs);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "listings");
      },
    );

    return () => unsubscribe();
  }, [category, searchQuery, minPrice, maxPrice, sortBy, locationFilter]);

  return (
    <div className="space-y-12 pb-24 md:pb-12 transition-colors duration-300">
      {/* Hero / Banner - SaaS Style */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 dark:bg-slate-950 px-6 py-16 md:px-12 md:py-20 text-white shadow-2xl mx-auto max-w-7xl">
        <div className="relative z-10 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mb-6"
          >
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-500/30 backdrop-blur-md">
              Marketplace 2.0
            </span>
            <span className="flex items-center gap-1 text-slate-400 text-xs font-medium">
              <Zap className="w-3 h-3 text-yellow-400" />
              Over 10k items sold today
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-7xl font-extrabold mb-6 tracking-tight leading-[0.95]"
          >
            Local trade <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              reimagined.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-lg md:text-xl max-w-md leading-relaxed mb-8"
          >
            The most intuitive marketplace for your local community. Secure,
            fast, and verified.
          </motion.p>
        </div>

        {/* Decorative elements */}
        <div className="absolute right-0 top-0 h-full w-1/2 opacity-20 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500 rounded-full blur-[120px]" />
          <div className="absolute top-1/4 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px]" />
        </div>

        {/* Floating cards simulation for professional feel */}
        <div className="hidden lg:block absolute right-12 top-1/2 -translate-y-1/2 space-y-4 pointer-events-none">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-64 p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl"
          >
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  Secure Payments
                </div>
                <div className="text-[10px] text-slate-400">
                  Escrow protected
                </div>
              </div>
            </div>
          </motion.div>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
            className="w-64 p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl ml-8"
          >
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Live Bidding</div>
                <div className="text-[10px] text-slate-400">
                  Real-time updates
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Categories - Minimal Pill Style */}

      <AdMobBanner placement="home" />

      {/* Filter Bar */}
      <div className="mx-auto max-w-7xl w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "rounded-2xl border-slate-200 dark:border-slate-800 font-bold flex items-center gap-2",
                (minPrice ||
                  maxPrice ||
                  locationFilter ||
                  sortBy !== "newest") &&
                  "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600",
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {(minPrice || maxPrice || locationFilter) && (
                <Badge className="ml-1 px-1.5 h-5 bg-blue-600">Active</Badge>
              )}
            </Button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 mb-8 grid grid-cols-1 md:grid-cols-4 gap-6 relative">
                <button
                  onClick={() => setShowFilters(false)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Price Range
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      placeholder="Min ₹"
                      type="number"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="rounded-xl border-slate-200 bg-white"
                    />
                    <span className="text-slate-300">-</span>
                    <Input
                      placeholder="Max ₹"
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="rounded-xl border-slate-200 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Location
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Enter neighborhood..."
                      className="pl-9 rounded-xl border-slate-200 bg-white"
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-end gap-2 pb-1">
                  <Button
                    variant="ghost"
                    className="flex-1 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200"
                    onClick={() => {
                      setMinPrice("");
                      setMaxPrice("");
                      setLocationFilter("");
                      setSortBy("newest");
                    }}
                  >
                    Clear All
                  </Button>
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold"
                    onClick={() => setShowFilters(false)}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Top Categories
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20"
            onClick={() => setShowAllCategories(!showAllCategories)}
          >
            {showAllCategories ? "Show less" : "View all"}
          </Button>
        </div>

        <div
          className={cn(
            "flex gap-3 pb-2 -mx-1 px-1 transition-all duration-300",
            showAllCategories ? "flex-wrap" : "overflow-x-auto no-scrollbar",
          )}
        >
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setCategory(cat.name || "All")}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-2xl transition-all duration-300 border-2 whitespace-nowrap",
                category === cat.name
                  ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105"
                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-200 dark:hover:border-blue-800",
              )}
            >
              {cat.name === "All" ? (
                <div
                  className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs",
                    category === "All"
                      ? "bg-white/20"
                      : "bg-slate-100 dark:bg-slate-800 text-blue-600",
                  )}
                >
                  A
                </div>
              ) : (
                <div className="w-6 h-6 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={
                      cat.image ||
                      `https://picsum.photos/seed/${cat.name}/100/100`
                    }
                    alt={cat.name || ""}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <span className="text-sm font-bold">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Listings Grid */}
      <div className="mx-auto max-w-7xl w-full pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight dark:text-white">
              Fresh Recommendations
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Based on your recent activity
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            {/* Buttons removed */}
          </div>
        </div>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6"
            >
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-48 md:h-72 bg-slate-200 animate-pulse rounded-xl"
                />
              ))}
            </motion.div>
          ) : listings.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300"
            >
              <p className="text-slate-500">
                No listings found in this category.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={category}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6"
            >
              {listings.map((listing, index) => (
                <React.Fragment key={listing.id}>
                  <ListingCard listing={listing} index={index} />
                  {(index + 1) % 10 === 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      className="group col-span-2 md:col-span-1"
                    >
                      <Card className="h-full flex flex-col overflow-hidden border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 shadow-sm border-dashed rounded-3xl">
                        <AdMobBanner
                          variant="inline"
                          placement="grid"
                          className="my-0 border-0 bg-transparent"
                        />
                        <CardContent className="p-3 md:p-5 text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Sponsored Ad
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </React.Fragment>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ListingCard({ listing, index }: { listing: Listing; index: number }) {
  const navigate = useNavigate();
  const [isFavorited, setIsFavorited] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    const checkFavorite = async () => {
      if (!user) return;
      const favRef = doc(db, "users", user.uid, "favorites", listing.id);
      const favSnap = await getDoc(favRef);
      setIsFavorited(favSnap.exists());
    };
    checkFavorite();
  }, [user, listing.id]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      if (window.confirm("Please login to favorite listings.")) {
        navigate("/login");
      }
      return;
    }
    const favRef = doc(db, "users", user.uid, "favorites", listing.id);
    try {
      if (isFavorited) {
        await deleteDoc(favRef);
        setIsFavorited(false);
      } else {
        await setDoc(favRef, {
          listingId: listing.id,
          userId: user.uid,
          createdAt: serverTimestamp(),
        });
        setIsFavorited(true);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="group"
    >
      <Link to={`/listing/${listing.id}`}>
        <Card className="h-full flex flex-col overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 rounded-3xl">
          <div className="relative aspect-[4/3] overflow-hidden bg-slate-50 dark:bg-slate-800">
            <img
              src={
                listing.images?.[0] ||
                `https://picsum.photos/seed/${listing.id}/400/300`
              }
              alt={listing.title}
              className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />

            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              {index === 0 && (
                <Badge className="bg-blue-600 text-white border-none shadow-lg shadow-blue-500/30 font-bold px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[9px] md:text-[10px]">
                  FEATURED
                </Badge>
              )}
              <Badge className="bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white backdrop-blur-md shadow-sm border-none px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[9px] md:text-[10px] font-bold">
                {listing.category}
              </Badge>
            </div>

            <button
              onClick={toggleFavorite}
              className={cn(
                "absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-xl transition-all duration-300 shadow-xl border border-white/20",
                isFavorited
                  ? "bg-red-500 text-white scale-110 shadow-red-500/20"
                  : "bg-white/20 text-white hover:bg-white/40",
              )}
            >
              <Heart className={cn("w-4 h-4", isFavorited && "fill-current")} />
            </button>

            {listing.status === "sold" && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                <Badge className="bg-red-500 text-white border-none px-4 py-1.5 md:px-6 md:py-2 rounded-full font-black text-xs md:text-sm tracking-widest shadow-2xl rotate-[-10deg]">
                  SOLD OUT
                </Badge>
              </div>
            )}
          </div>

          <CardContent className="p-3 md:p-5 flex-1 flex flex-col gap-1 md:gap-2">
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-black text-lg md:text-xl">
              <span className="text-xs md:text-sm opacity-70">₹</span>
              {listing.price.toLocaleString()}
            </div>

            <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base line-clamp-2 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {listing.title}
            </h3>
          </CardContent>

          <CardFooter className="px-3 py-3 md:px-5 md:py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-2 md:gap-3">
            <div className="flex items-center justify-between w-full text-[9px] md:text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-blue-600/50" />
                <span className="truncate max-w-[70px] md:max-w-[100px]">
                  {listing.location || "Local"}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3" />
                <span>
                  {listing.createdAt
                    ?.toDate()
                    .toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              className="w-full h-8 md:h-9 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-all duration-300 font-bold text-[10px] md:text-xs uppercase tracking-widest px-2"
            >
              View Details
            </Button>
          </CardFooter>
        </Card>
      </Link>
    </motion.div>
  );
}
