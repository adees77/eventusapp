import { getDay, getMonth, parseISO } from "date-fns";
import { demoConfig } from "@/config/demo";
import type { Booking, DB, Offer } from "./types";

/** Statuses that hold inventory */
export const HOLDING_STATUSES: Booking["status"][] = ["pending", "prepaid", "confirmed", "completed"];

/** An unpaid booking holds units for this long, then frees them */
export const PENDING_HOLD_MS = 15 * 60 * 1000;

export function holdsInventory(b: Booking, now = Date.now()) {
  if (!HOLDING_STATUSES.includes(b.status)) return false;
  if (b.status === "pending") return now - new Date(b.createdAt).getTime() < PENDING_HOLD_MS;
  return true;
}

/** FNV-1a 32-bit — deterministic, fast, good enough for demo noise */
export function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * DEMO ONLY: simulated "background" occupancy so calendars look alive
 * (other clients, offline sales). Weekends in wedding season are busier.
 * Disabled with demoConfig.baselineOccupancy = false. Not used in production.
 */
export function baselineBlocked(offer: Offer, date: string): number {
  if (!demoConfig.baselineOccupancy) return 0;
  const d = parseISO(date);
  const dow = getDay(d); // 0 Sun … 6 Sat
  const month = getMonth(d); // 0 Jan
  const weekend = dow === 0 || dow === 5 || dow === 6;
  const season = month >= 4 && month <= 8; // May–Sep
  let maxShare = 0.12;
  if (season && weekend) maxShare = 0.6;
  else if (season || weekend) maxShare = 0.3;

  const r = (hash(`${offer.id}:${date}`) % 1000) / 1000;
  if (offer.totalUnits === 1) {
    // single-unit items: probability of being taken
    return r < maxShare * 0.7 ? 1 : 0;
  }
  return Math.floor(offer.totalUnits * maxShare * r);
}

export interface Availability {
  total: number;
  blocked: number;
  booked: number;
  free: number;
}

export function getAvailability(db: Pick<DB, "blocks" | "bookings">, offer: Offer, date: string): Availability {
  const manual = db.blocks.find((b) => b.offerId === offer.id && b.date === date);
  const blocked = manual ? manual.units : baselineBlocked(offer, date);
  const booked = db.bookings
    .filter((b) => b.offerId === offer.id && b.date === date && holdsInventory(b))
    .reduce((s, b) => s + b.qty, 0);
  const free = Math.max(0, offer.totalUnits - blocked - booked);
  return { total: offer.totalUnits, blocked, booked, free };
}

/** Aggregate across all active offers of a vendor */
export function getVendorAvailability(db: DB, vendorId: string, date: string): Availability {
  const offers = db.offers.filter((o) => o.vendorId === vendorId && o.active);
  return offers.reduce<Availability>(
    (acc, o) => {
      const a = getAvailability(db, o, date);
      return {
        total: acc.total + a.total,
        blocked: acc.blocked + a.blocked,
        booked: acc.booked + a.booked,
        free: acc.free + a.free,
      };
    },
    { total: 0, blocked: 0, booked: 0, free: 0 },
  );
}
