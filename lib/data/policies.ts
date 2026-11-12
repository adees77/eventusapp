/**
 * Access rules — the single source of truth for "who can do what".
 * Every mutation in the store calls `assert(can.xxx(...))`.
 * The same rules are expressed as Postgres RLS policies in supabase/schema.sql.
 */
import type { Booking, Conversation, DB, Offer, Role, Vendor } from "./types";

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

export function assert(allowed: boolean, action: string): asserts allowed {
  if (!allowed) throw new PolicyError(action);
}

const isAdmin = (a: Actor) => a.role === "admin";
const ownsVendor = (a: Actor, v: Vendor | undefined) => !!v && a.role === "vendor" && v.ownerId === a.id;

export const can = {
  /** Clients design invitations for their own events; admin can moderate */
  manageInvitation: (a: Actor, ownerId: string) => isAdmin(a) || (a.role === "client" && a.id === ownerId),

  /** Public catalog: hidden vendors are visible only to owner and admin */
  viewVendor: (a: Actor | null, v: Vendor) => !v.hidden || (!!a && (isAdmin(a) || ownsVendor(a, v))),

  editVendor: (a: Actor, v: Vendor) => isAdmin(a) || ownsVendor(a, v),
  createVendor: (a: Actor) => isAdmin(a),
  /** A freshly signed-up user turns their own account into a vendor (no vendor yet) */
  registerOwnVendor: (a: Actor, db: DB) => a.role !== "admin" && !db.vendors.some((v) => v.ownerId === a.id),
  /** Users edit only their own profile */
  editProfile: (a: Actor, userId: string) => isAdmin(a) || a.id === userId,
  setVendorHidden: (a: Actor) => isAdmin(a),
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

  manageEvent: (a: Actor, clientId: string) => a.role === "client" && a.id === clientId,
  favorite: (a: Actor) => a.role === "client",

  /** Comments are only for people who really used the vendor: a client with a finished deal */
  commentPost: (a: Actor, db: Pick<DB, "bookings">, vendorId: string) =>
    a.role === "client" &&
    db.bookings.some((b) => b.clientId === a.id && b.vendorId === vendorId && isFinishedDeal(b)),
};
