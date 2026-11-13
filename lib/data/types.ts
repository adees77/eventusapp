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
  /** admin moderation */
  blocked?: boolean;
  createdAt?: string;
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
  /** category-specific details (fleet, hall area, languages…), see lib/data/specs.ts */
  specs?: VendorSpecs;
  /** orders done before joining EVENTUS; completed bookings on the platform are added on top */
  ordersBase?: number;
  /** a verification request: set when the vendor sends documents, cleared when admin approves */
  verification?: { state: "pending" | "rejected"; requestedAt: string; note?: string; reviewedAt?: string };
}

export type DocKind = "passport" | "registration" | "license" | "contract";

/** A document the vendor uploads for verification (demo keeps the file name only) */
export interface VendorDocument {
  id: string;
  vendorId: string;
  kind: DocKind;
  fileName: string;
  status: "pending" | "approved" | "rejected";
  note?: string;
  uploadedAt: string;
  reviewedAt?: string;
}

export type ComplaintTarget = "vendor" | "post" | "review";
export type ComplaintReason = "fraud" | "fake" | "offensive" | "spam" | "quality" | "other";

/** A user's report about a vendor, a post or a review; admin resolves it */
export interface Complaint {
  id: string;
  authorId: string;
  target: ComplaintTarget;
  targetId: string;
  /** the vendor the content belongs to, for grouping */
  vendorId: string;
  reason: ComplaintReason;
  text?: string;
  status: "open" | "resolved" | "dismissed";
  /** what admin did: hid the content or left it */
  resolution?: "hidden" | "kept";
  createdAt: string;
  resolvedAt?: string;
}

/** One row of a repeatable spec list: a car, a hall room, a furniture item… */
export type SpecItem = Record<string, string | number | undefined>;
export type SpecValue = string | number | boolean | string[] | SpecItem[];
export type VendorSpecs = Record<string, SpecValue>;

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
  /** P2P escrow: the prepayment is frozen until both sides confirm the deal */
  escrow?: Escrow;
}

export type EscrowState = "none" | "held" | "released" | "refunded" | "disputed";

export interface EscrowDispute {
  /** user id who opened it */
  by: string;
  reason: string;
  openedAt: string;
  resolution?: "release" | "refund";
  resolvedAt?: string;
}

export interface Escrow {
  state: EscrowState;
  /** frozen amount (the prepayment) */
  amount: number;
  heldAt?: string;
  clientConfirmedAt?: string;
  vendorConfirmedAt?: string;
  releasedAt?: string;
  refundedAt?: string;
  dispute?: EscrowDispute;
}

export type TransactionKind = "hold" | "release" | "fee" | "refund" | "payout";

/** Money ledger. Balances are always derived from it, never stored. */
export interface Transaction {
  id: string;
  kind: TransactionKind;
  amount: number;
  bookingId?: string;
  vendorId?: string;
  clientId?: string;
  createdAt: string;
  note?: string;
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
  /** set when left by a client after a completed booking */
  bookingId?: string;
  authorId?: string;
  reply?: { text: string; date: string };
  hidden?: boolean;
}

/** A photo post in the social feed, published by a vendor */
export interface Post {
  id: string;
  vendorId: string;
  photos: string[];
  caption: LText;
  category: CategoryId;
  offerId?: string;
  /** seeded likes from people outside the demo */
  baseLikes: number;
  /** height / width of the first photo, drives the masonry layout */
  ratio: number;
  hidden?: boolean;
  createdAt: string;
}

/** A comment under a post. Only clients with a finished deal with this vendor can write one. */
export interface PostComment {
  id: string;
  postId: string;
  /** set for comments written in the app (seeded ones come from past clients) */
  userId?: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface PostLike {
  userId: string;
  postId: string;
}

export interface Follow {
  userId: string;
  vendorId: string;
}

export type NotificationKind =
  | "message"
  | "escrow_held"
  | "escrow_confirm"
  | "escrow_released"
  | "escrow_refunded"
  | "escrow_disputed"
  | "booking_new"
  | "booking_status"
  | "rsvp"
  | "review"
  | "follow"
  | "system";

export interface AppNotification {
  id: string;
  userId: string;
  kind: NotificationKind;
  text: LText;
  href?: string;
  read: boolean;
  createdAt: string;
}

export interface PlatformSettings {
  /** platform commission on released deals, percent */
  feePercent: number;
  defaultPrepayPercent: number;
  /** auto-release window after the event date, days */
  autoReleaseDays: number;
  /** documents a vendor must have approved to get the «verified» badge */
  requiredDocs: DocKind[];
  /** open complaints after which a post or vendor is hidden until review; 0 = off */
  autoHideComplaints: number;
  /** reviews at or below this rating land in the admin «low rated» queue */
  lowRatingThreshold: number;
  /** admins get a notification on every new complaint */
  notifyOnComplaint: boolean;
  /** new vendors stay hidden from the catalog until verified */
  hideUnverified: boolean;
  supportPhone: string;
  supportEmail: string;
}

export interface Favorite {
  userId: string;
  vendorId: string;
}

export interface VendorStat {
  vendorId: string;
  views: number;
}

export type InvitationStyle = "classic" | "minimal" | "night" | "arch" | "ornament" | "photo";
export type InvitationOccasion = "wedding" | "kyzUzatuu" | "birthday" | "jubilee" | "sunnot" | "corporate";

/** A guest's answer, left on the public invitation page */
export interface InvitationRsvp {
  id: string;
  /** set when the guest opened a personal link */
  guestId?: string;
  name: string;
  attending: boolean;
  /** people including the guest */
  guests: number;
  note?: string;
  createdAt: string;
}

export interface Invitation {
  id: string;
  ownerId: string;
  eventId?: string;
  /** template it was started from, if any */
  templateId?: string;
  style: InvitationStyle;
  occasion: InvitationOccasion;
  /** small line above the names: "Приглашаем на свадьбу" */
  heading: string;
  /** the largest line: "Айгерим и Тимур" */
  names: string;
  message: string;
  /** yyyy-MM-dd */
  date: string;
  /** HH:mm */
  time: string;
  venue: string;
  address: string;
  dressCode?: string;
  contact?: string;
  /** cover photo for the "photo" style */
  photo?: string;
  rsvps: InvitationRsvp[];
  /** v2: the web page itself, built from blocks */
  design: InvitationDesign;
  /** guest list with personal links */
  guests: InvitationGuest[];
  views: InvitationView[];
  createdAt: string;
  updatedAt: string;
}

export type BlockType =
  | "cover"
  | "heading"
  | "text"
  | "image"
  | "divider"
  | "date"
  | "countdown"
  | "venue"
  | "schedule"
  | "dresscode"
  | "gallery"
  | "rsvp"
  | "contacts"
  | "spacer";

export type FontKey = "serif" | "sans" | "script";

export interface BlockStyle {
  align?: "left" | "center" | "right";
  /** text scale */
  size?: "s" | "m" | "l" | "xl";
  font?: FontKey;
  /** overrides theme ink */
  color?: string;
  /** section background override */
  bg?: string;
  /** vertical padding in px */
  padY?: number;
  italic?: boolean;
  hidden?: boolean;
}

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  text?: string;
}

export interface InvitationBlock {
  id: string;
  type: BlockType;
  /** free text fields of the block (title, text, kicker, label, url…) */
  props: Record<string, string>;
  images?: string[];
  items?: ScheduleItem[];
  style: BlockStyle;
}

export interface InvitationTheme {
  id: string;
  /** page background */
  bg: string;
  /** main text */
  ink: string;
  /** secondary text */
  muted: string;
  /** hairlines, numbers, buttons */
  accent: string;
  /** surface for cards (rsvp, schedule) */
  surface: string;
  display: FontKey;
  body: FontKey;
}

export interface InvitationDesign {
  theme: InvitationTheme;
  blocks: InvitationBlock[];
}

export interface InvitationGuest {
  id: string;
  name: string;
  phone?: string;
  group?: string;
  /** expected people incl. the guest */
  seats: number;
  sentAt?: string;
  openedAt?: string;
  /** added by the host without sending an invitation: counts as coming right away */
  direct?: boolean;
}

export interface InvitationView {
  at: string;
  guestId?: string;
}

export interface DB {
  version: number;
  /** version of the demo vendors' details (lib/data/seed/specs.ts); bumped when the schema grows */
  specsVersion?: number;
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
  invitations: Invitation[];
  posts: Post[];
  likes: PostLike[];
  comments: PostComment[];
  saved: PostLike[];
  follows: Follow[];
  transactions: Transaction[];
  notifications: AppNotification[];
  documents: VendorDocument[];
  complaints: Complaint[];
  settings: PlatformSettings;
}
