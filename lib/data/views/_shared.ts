/**
 * Joins shared by the view selectors. Each view is a pure `(db, params) => data`
 * function plus a `useX(params)` hook: pages never read the DB snapshot themselves,
 * so moving a view to Supabase means replacing one selector with one query.
 */
import type { Booking, DB, LText } from "../types";

export const nameOf = (db: Pick<DB, "users">, id?: string) => (id ? (db.users.find((u) => u.id === id)?.name ?? "") : "");
export const vendorNameOf = (db: Pick<DB, "vendors">, id?: string) => (id ? (db.vendors.find((v) => v.id === id)?.name ?? "") : "");

/** A booking with everything a list row shows next to it */
export interface BookingView {
  booking: Booking;
  vendorName: string;
  vendorSlug?: string;
  vendorOwnerId?: string;
  clientName: string;
  offerTitle?: LText;
  offerPhoto?: string;
  conversationId?: string;
  /** the client already left a review for this booking */
  reviewed: boolean;
}

export function bookingView(db: DB, b: Booking): BookingView {
  const v = db.vendors.find((x) => x.id === b.vendorId);
  const o = db.offers.find((x) => x.id === b.offerId);
  return {
    booking: b,
    vendorName: v?.name ?? "",
    vendorSlug: v?.slug,
    vendorOwnerId: v?.ownerId,
    clientName: nameOf(db, b.clientId),
    offerTitle: o?.title,
    offerPhoto: o?.photos[0],
    conversationId: db.conversations.find((c) => c.bookingId === b.id)?.id,
    reviewed: db.reviews.some((r) => r.bookingId === b.id),
  };
}
