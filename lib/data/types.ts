/**
 * Domain model. Mirrors supabase/schema.sql 1:1 so the mock store can be
 * swapped for Supabase without touching UI code.
 */

export type Locale = "ru" | "en";
export type LText = { ru: string; en: string };

export type Role = "client" | "vendor" | "admin";

export type CategoryId =
  | "cars"
  | "halls"
  | "furniture"
  | "hosts"
  | "photo"
  | "decor"
  | "music"
  | "cakes"
  | "beauty"
  | "attire"
  | "traditional"
  | "shows";

export interface User {
  id: string;
  role: Role;
  name: string;
  phone?: string;
  avatar?: string;
  email?: string;
  authProvider?: AuthProvider;
  city?: string;
  /** Set for accounts created through sign-up; cleared when the chat onboarding is done */
  needsOnboarding?: boolean;
  onboardedAt?: string;
}

export type AuthProvider = "google" | "email" | "demo";

export interface Category {
  id: CategoryId;
  name: LText;
  /** lucide icon name, resolved in components/category-icon.tsx */
  icon: string;
  order: number;
}

export interface Vendor {
  id: string;
  ownerId: string;
  slug: string;
  name: string;
  category: CategoryId;
  city: string;
  tagline: LText;
  description: LText;
  rating: number;
  reviewsCount: number;
  verified: boolean;
  hidden: boolean;
  /** percent of total, 0–100 */
  prepayPercent: number;
  cover: string;
  portfolio: string[];
  phone: string;
  instagram?: string;
  yearsOnMarket: number;
  responseMinutes: number;
  createdAt: string;
}

export interface Offer {
  id: string;
  vendorId: string;
  title: LText;
  description: LText;
  /** price in KGS (сом) per unit */
  price: number;
  unit: LText;
  totalUnits: number;
  /** max units per single booking, defaults to totalUnits */
  maxPerBooking?: number;
  /** guests capacity for halls, for search filtering */
  capacity?: number;
  photos: string[];
  premium?: boolean;
  active: boolean;
}

/** Vendor-side manual blocking of units on a given date (offline sales etc.) */
export interface AvailabilityBlock {
  id: string;
  offerId: string;
  /** ISO date yyyy-MM-dd */
  date: string;
  units: number;
}

export type BookingStatus = "pending" | "prepaid" | "confirmed" | "completed" | "cancelled";

export interface Booking {
  id: string;
  offerId: string;
  vendorId: string;
  clientId: string;
  eventId?: string;
  date: string;
  qty: number;
  total: number;
  prepayAmount: number;
  status: BookingStatus;
  paymentRef?: string;
  note?: string;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  done: boolean;
  category?: CategoryId;
}

export interface EventItem {
  id: string;
  clientId: string;
  title: string;
  date: string;
  city: string;
  guests: number;
  budget: number;
  checklist: ChecklistItem[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  clientId: string;
  vendorId: string;
  bookingId?: string;
  createdAt: string;
  updatedAt: string;
  /** per-user last read timestamp */
  readAt: Record<string, string>;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  system?: boolean;
}

export interface Review {
  id: string;
  vendorId: string;
  author: string;
  rating: number;
  text: LText;
  date: string;
}

export interface Favorite {
  userId: string;
  vendorId: string;
}

export interface VendorStat {
  vendorId: string;
  views: number;
}

export interface DB {
  version: number;
  users: User[];
  categories: Category[];
  vendors: Vendor[];
  offers: Offer[];
  blocks: AvailabilityBlock[];
  bookings: Booking[];
  events: EventItem[];
  conversations: Conversation[];
  messages: Message[];
  reviews: Review[];
  favorites: Favorite[];
  stats: VendorStat[];
}
