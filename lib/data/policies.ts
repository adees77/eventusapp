/**
 * Access rules — the single source of truth for "who can do what".
 * Every mutation in the store calls `assert(can.xxx(...))`.
 * The same rules are expressed as Postgres RLS policies and server functions in supabase/migrations.
 */
import type { Booking, Conversation, DB, DocKind, Offer, Role, Vendor } from "./types";

export interface Actor {
  id: string;
  role: Role;
}

export class PolicyError extends Error {
  constructor(action: string) {
    super(`Access denied: ${action}`);
    this.name = "PolicyError";
  }
}

/**
 * A deal that really happened: completed, or paid out to the vendor — but never a
 * cancelled one (a vendor may cancel after the payout; that must not count as an
 * order done or let the client post a «real client» review).
 */
export const isFinishedDeal = (b: Pick<Booking, "status" | "escrow">) =>
  b.status !== "cancelled" && (b.status === "completed" || b.escrow?.state === "released");

export const DOC_KINDS: DocKind[] = ["passport", "registration", "license", "contract"];

/** Required document kinds the vendor still has to upload (a rejected file counts as missing) */
export function missingDocs(db: Pick<DB, "documents" | "settings">, vendorId: string): DocKind[] {
  const ok = (k: DocKind) => db.documents.some((x) => x.vendorId === vendorId && x.kind === k && x.status !== "rejected");
  return (db.settings.requiredDocs ?? []).filter((k) => !ok(k));
}

export function assert(allowed: boolean, action: string): asserts allowed {
  if (!allowed) throw new PolicyError(action);
}

const isAdmin = (a: Actor) => a.role === "admin";
const ownsVendor = (a: Actor, v: Vendor | undefined) => !!v && a.role === "vendor" && v.ownerId === a.id;

/** The vendor wrote by hand this recently → their AI assistant stays quiet in that chat */
export const ASSISTANT_PAUSE_MS = 12 * 60 * 60 * 1000;

/**
 * Whether the vendor's AI assistant answers in this chat now: the vendor has it
 * on (default) and has not written there themselves within the pause window.
 */
export function assistantActive(
  db: Pick<DB, "vendors" | "messages">,
  c: Pick<Conversation, "id" | "vendorId">,
  now = Date.now(),
): boolean {
  const v = db.vendors.find((x) => x.id === c.vendorId);
  if (!v || v.aiAssistant === false) return false;
  const manual = db.messages.filter((m) => m.conversationId === c.id && m.senderId === v.ownerId && !m.ai && !m.system);
  const last = manual.reduce((t, m) => Math.max(t, Date.parse(m.createdAt)), 0);
  return now - last > ASSISTANT_PAUSE_MS;
}

export const can = {
  /** Clients design invitations for their own events; admin can moderate */
  manageInvitation: (a: Actor, ownerId: string) => isAdmin(a) || (a.role === "client" && a.id === ownerId),

  /** Public catalog: hidden vendors are visible only to owner and admin */
  viewVendor: (a: Actor | null, v: Vendor) => !v.hidden || (!!a && (isAdmin(a) || ownsVendor(a, v))),

  editVendor: (a: Actor, v: Vendor) => isAdmin(a) || ownsVendor(a, v),
  createVendor: (a: Actor) => isAdmin(a),
  /** Users edit only their own profile */
  editProfile: (a: Actor, userId: string) => isAdmin(a) || a.id === userId,
  setVendorHidden: (a: Actor) => isAdmin(a),
  /** The vendor uploads own verification papers; admin reviews them */
  manageDocuments: (a: Actor, v: Vendor | undefined) => isAdmin(a) || ownsVendor(a, v),
  reviewDocuments: (a: Actor) => isAdmin(a),
  /** Any signed-in client or vendor may report content; admin resolves */
  report: (a: Actor) => a.role === "client" || a.role === "vendor",
  resolveComplaint: (a: Actor) => isAdmin(a),
  setVendorVerified: (a: Actor) => isAdmin(a),

  editOffer: (a: Actor, db: DB, o: Pick<Offer, "vendorId">) =>
    isAdmin(a) || ownsVendor(a, db.vendors.find((v) => v.id === o.vendorId)),

  editAvailability: (a: Actor, db: DB, offer: Offer) => can.editOffer(a, db, offer),

  /** Only clients create bookings for themselves */
  createBooking: (a: Actor, clientId: string) => a.role === "client" && a.id === clientId,

  viewBooking: (a: Actor, db: DB, b: Booking) =>
    isAdmin(a) || b.clientId === a.id || ownsVendor(a, db.vendors.find((v) => v.id === b.vendorId)),

  /** Client pays own booking; vendor confirms/cancels; client can cancel pending */
  payBooking: (a: Actor, b: Booking) => a.id === b.clientId && b.status === "pending",
  setBookingStatus: (a: Actor, db: DB, b: Booking, next: Booking["status"]) => {
    if (isAdmin(a)) return true;
    if (ownsVendor(a, db.vendors.find((v) => v.id === b.vendorId))) return next !== "pending";
    if (a.id === b.clientId) return next === "cancelled" && (b.status === "pending" || b.escrow?.state === "held");
    return false;
  },

  viewConversation: (a: Actor, db: DB, c: Conversation) =>
    isAdmin(a) || c.clientId === a.id || ownsVendor(a, db.vendors.find((v) => v.id === c.vendorId)),
  sendMessage: (a: Actor, db: DB, c: Conversation) =>
    c.clientId === a.id || ownsVendor(a, db.vendors.find((v) => v.id === c.vendorId)),

  /**
   * The vendor's AI assistant posts its answer into the chat on the vendor's behalf.
   * Local data: the client's browser runs it. Supabase: a server function with the service role.
   */
  assistantReply: (a: Actor, db: DB, c: Conversation) => a.role === "client" && c.clientId === a.id && assistantActive(db, c),

  manageEvent: (a: Actor, clientId: string) => a.role === "client" && a.id === clientId,
  favorite: (a: Actor) => a.role === "client",

  /** Comments are only for people who really used the vendor: a client with a finished deal */
  commentPost: (a: Actor, db: Pick<DB, "bookings">, vendorId: string) =>
    a.role === "client" &&
    db.bookings.some((b) => b.clientId === a.id && b.vendorId === vendorId && isFinishedDeal(b)),
};
