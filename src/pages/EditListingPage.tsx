import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db, auth } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  onSnapshot,
} from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tag,
  MapPin,
  IndianRupee,
  Image as ImageIcon,
  LayoutGrid,
  Navigation,
  Map as MapIcon,
  X as CloseIcon,
  Loader2,
} from "lucide-react";
import { Listing } from "../types";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { uploadImage } from "../services/uploadService";

// Fix leaflet default icon issue
let DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function EditListingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [categories, setCategories] = useState<
    { id: string; name: string; image?: string }[]
  >([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    location: "",
    images: [] as string[],
    newFiles: [] as { file: File; preview: string }[],
  });

  const [showMap, setShowMap] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<
    [number, number] | null
  >(null);

  function LocationMarker() {
    const map = useMapEvents({
      click(e) {
        setSelectedLocation([e.latlng.lat, e.latlng.lng]);
      },
    });

    useEffect(() => {
      // Fix for Leaflet map in modal (gray box issue)
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }, [map]);

    return selectedLocation === null ? null : (
      <Marker position={selectedLocation} />
    );
  }

  const confirmMapSelection = async () => {
    if (!selectedLocation) {
      setShowMap(false);
      return;
    }
    setShowMap(false);
    setDetecting(true);
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${selectedLocation[0]}&longitude=${selectedLocation[1]}&localityLanguage=en`,
      );
      const data = await response.json();
      const city = data.city || data.locality || "";
      const state = data.principalSubdivision || "";
      const locationString =
        city && state
          ? `${city}, ${state}`
          : city || state || "Unknown Location";
      setFormData((prev) => ({ ...prev, location: locationString }));
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      alert("Failed to get location name. Please enter manually.");
    } finally {
      setDetecting(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(
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
    return () => unsubscribe();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 5 - formData.images.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
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

          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          setFormData((prev) => ({
            ...prev,
            newFiles: [...prev.newFiles, { file, preview: dataUrl }],
          }));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const removeExistingImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const removeNewImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      newFiles: prev.newFiles.filter((_, i) => i !== index),
    }));
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
          );
          const data = await response.json();
          const city = data.city || data.locality || "";
          const state = data.principalSubdivision || "";
          const locationString =
            city && state
              ? `${city}, ${state}`
              : city || state || "Unknown Location";
          setFormData((prev) => ({ ...prev, location: locationString }));
        } catch (error) {
          console.error("Error reverse geocoding:", error);
          alert("Failed to get location name. Please enter manually.");
        } finally {
          setDetecting(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Unable to retrieve your location. Please check permissions.");
        setDetecting(false);
      },
    );
  };

  useEffect(() => {
    const fetchListingAndCheckAccess = async () => {
      if (!id || !auth.currentUser) return;

      let adminStatus = false;
      if (auth.currentUser.email === "sachinraghav9090@gmail.com") {
        adminStatus = true;
        setIsAdmin(true);
      } else {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists() && userDoc.data().role === "admin") {
          adminStatus = true;
          setIsAdmin(true);
        }
      }

      const docRef = doc(db, "listings", id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as Listing;

        if (data.sellerId !== auth.currentUser.uid && !adminStatus) {
          alert("You don't have permission to edit this listing.");
          navigate("/");
          return;
        }

        setFormData({
          title: data.title || "",
          description: data.description || "",
          price: data.price ? data.price.toString() : "",
          category: data.category || "Phones",
          location: data.location || "",
          images: data.images || [],
          newFiles: [],
        });
      } else {
        alert("Listing not found.");
        navigate("/");
      }
      setLoading(false);
    };

    fetchListingAndCheckAccess();
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !id) return;

    setSaving(true);
    try {
      // 1. Upload new images to Cloudinary
      const uploadedImageUrls: string[] = [];
      for (const item of formData.newFiles) {
        try {
          const result = await uploadImage(item.file);
          uploadedImageUrls.push(result.url);
        } catch (uploadErr: any) {
          console.error("Failed to upload image:", uploadErr);
          const errorMsg = uploadErr.message || "Unknown error";
          alert(
            `Image upload failed: ${errorMsg}\n\nPlease ensure your Cloudinary credentials are set up on the server.`,
          );
          setSaving(false);
          return;
        }
      }

      // Combine existing and new URLs
      const finalImages = [...formData.images, ...uploadedImageUrls];

      const docRef = doc(db, "listings", id);
      await updateDoc(docRef, {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        location: formData.location,
        images: finalImages,
      });
      navigate(`/listing/${id}`);
    } catch (error) {
      console.error("Error updating listing: ", error);
      alert("Failed to update listing. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">Loading...</div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-0 pb-24 md:pb-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="pt-8">
        <h1 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 mb-4">
          Edit Ad<span className="text-blue-600">.</span>
        </h1>
        <p className="text-lg text-slate-500">
          Update details to keep your listing fresh and relevant.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Images */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-slate-400" />
              Photos ({formData.images.length}/5)
            </h2>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
              Step 1
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Existing Images */}
            {formData.images.map((url, index) => (
              <div
                key={`existing-${index}`}
                className="relative aspect-square bg-slate-100 rounded-3xl overflow-hidden group shadow-sm border border-slate-200/50"
              >
                <img
                  src={url}
                  alt={`Existing ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <button
                  type="button"
                  onClick={() => removeExistingImage(index)}
                  className="absolute top-3 right-3 bg-white/90 hover:bg-red-500 hover:text-white text-slate-600 p-2 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 shadow-lg scale-90 group-hover:scale-100"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
                {index === 0 && (
                  <div className="absolute bottom-3 left-3 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                    Cover
                  </div>
                )}
              </div>
            ))}

            {/* New Images */}
            {formData.newFiles.map((item, index) => (
              <div
                key={`new-${index}`}
                className="relative aspect-square bg-blue-50/50 rounded-3xl overflow-hidden group shadow-sm border border-blue-200/50"
              >
                <img
                  src={item.preview}
                  alt={`New ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <button
                  type="button"
                  onClick={() => removeNewImage(index)}
                  className="absolute top-3 right-3 bg-white/90 hover:bg-red-500 hover:text-white text-slate-600 p-2 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 shadow-lg scale-90 group-hover:scale-100"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
                {formData.images.length === 0 && index === 0 && (
                  <div className="absolute bottom-3 left-3 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                    Cover
                  </div>
                )}
                <div className="absolute top-3 left-3 bg-blue-600 text-white text-[8px] font-bold uppercase px-2 py-0.5 rounded-full">
                  New
                </div>
              </div>
            ))}

            {formData.images.length + formData.newFiles.length < 5 && (
              <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-3xl bg-slate-50 hover:bg-white transition-all duration-300 cursor-pointer group/up">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm border border-slate-100 group-hover/up:scale-110 transition-all duration-300">
                  <ImageIcon className="w-5 h-5 text-slate-400" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Upload Photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </section>

        <div className="h-px bg-slate-100 w-full" />

        {/* Details */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Ad Details
            </h2>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
              Step 2
            </span>
          </div>

          <div className="space-y-5 bg-slate-50 p-6 md:p-8 rounded-[2rem]">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-500 ml-1">
                Title
              </label>
              <Input
                required
                placeholder="What are you selling?"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="h-14 bg-white border-0 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 text-base shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-500 ml-1">
                Category
              </label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger className="h-14 bg-white border-0 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 text-base shadow-sm">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100 p-2 shadow-xl">
                  {categories.map((cat) => (
                    <SelectItem
                      key={cat.id}
                      value={cat.name}
                      className="py-3 px-3 cursor-pointer rounded-xl focus:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center shrink-0">
                          {cat.image ? (
                            <img
                              src={cat.image}
                              alt={cat.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <LayoutGrid className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <span className="font-semibold">{cat.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                  {categories.length === 0 && (
                    <div className="p-4 text-sm text-slate-500 text-center">
                      No categories available
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-500 ml-1">
                Description
              </label>
              <textarea
                required
                rows={5}
                placeholder="Describe your item in detail (condition, age, features)..."
                className="w-full p-4 rounded-xl resize-none bg-white border-0 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-base"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>
        </section>

        {/* Pricing & Location */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Pricing & Location
            </h2>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
              Step 3
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-6 rounded-[2rem] space-y-2">
              <label className="text-sm font-semibold text-slate-500 ml-1">
                Set Price (₹)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <IndianRupee className="w-5 h-5 text-slate-400" />
                </div>
                <Input
                  required
                  type="number"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="h-14 pl-12 bg-white border-0 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-lg font-semibold shadow-sm"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-[2rem] space-y-2">
              <div className="flex items-center justify-between ml-1 mb-1">
                <label className="text-sm font-semibold text-slate-500">
                  Location
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMap(true)}
                    className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1 rounded-full transition-colors"
                  >
                    <MapIcon className="w-3 h-3" /> Map
                  </button>
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={detecting}
                    className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition-colors disabled:opacity-50"
                  >
                    <Navigation
                      className={`w-3 h-3 ${detecting ? "animate-pulse" : ""}`}
                    />
                    {detecting ? "Detecting..." : "Auto"}
                  </button>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <MapPin className="w-5 h-5 text-slate-400" />
                </div>
                <Input
                  required
                  placeholder="City, State"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="h-14 pl-12 bg-white border-0 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-base shadow-sm"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Map Modal */}
        {showMap && (
          <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] w-full max-w-2xl mx-auto overflow-hidden shadow-2xl flex flex-col h-[70vh] sm:h-[600px] animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <MapIcon className="w-5 h-5 text-blue-600" /> Choose Location
                </h3>
                <button
                  type="button"
                  onClick={() => setShowMap(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 relative bg-slate-100 min-h-0">
                <MapContainer
                  center={[20.5937, 78.9629]}
                  zoom={4}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <LocationMarker />
                </MapContainer>
                {!selectedLocation && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur text-slate-700 px-4 py-2 rounded-full font-medium text-sm shadow-lg whitespace-nowrap pointer-events-none">
                    Tap on the map to select a location
                  </div>
                )}
              </div>
              <div className="p-4 sm:p-6 bg-white border-t border-slate-100 shrink-0">
                <Button
                  type="button"
                  onClick={confirmMapSelection}
                  disabled={!selectedLocation}
                  className="w-full h-14 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-600/20 disabled:shadow-none"
                >
                  {selectedLocation
                    ? "Confirm Location"
                    : "Select a location on map"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="pt-8 flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/listing/${id}`)}
            className="flex-1 h-14 rounded-xl text-base"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="flex-1 h-14 rounded-xl bg-blue-600 hover:bg-blue-700 text-base font-semibold shadow-xl shadow-blue-600/20"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
