import { Timestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  mobile?: string;
  dob?: string;
  bio?: string;
  address?: string;
  referralCode?: string;
  referredBy?: string;
  role?: "admin" | "user" | "buyer" | "seller";
  isBanned?: boolean;
  lastPhotoUpdate?: Timestamp;
  isOnline?: boolean;
  lastActive?: Timestamp;
  createdAt: Timestamp;
}

export interface Listing {
  id: string;
  title: string;
  description?: string;
  price: number;
  category?: string;
  location?: string;
  images?: string[];
  sellerId: string;
  sellerName: string;
  sellerPhoto?: string;
  status: "active" | "sold";
  createdAt: Timestamp;
}

export interface Chat {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImage?: string;
  sellerId: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: Timestamp;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  type?: "text" | "call" | "image" | "video" | "location" | "offer";
  fileUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
    isLive?: boolean;
    expiresAt?: Timestamp;
  };
  offerDetails?: {
    price: number;
    status: "pending" | "accepted" | "rejected";
  };
  callStatus?: "ended" | "missed" | "rejected";
  duration?: number;
  createdAt: Timestamp;
}

export interface Category {
  id: string;
  name: string;
  image?: string;
}

export interface Report {
  id: string;
  listingId: string;
  listingTitle: string;
  reporterId: string;
  reporterEmail: string;
  reason: string;
  status: "pending" | "resolved";
  createdAt: Timestamp;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  subject: string;
  message: string;
  status: "open" | "closed";
  createdAt: Timestamp;
}

export interface Rule {
  id: string;
  title: string;
  description: string;
  order?: number;
}
