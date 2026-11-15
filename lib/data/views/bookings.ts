"use client";

/** Booking lists for the client and the vendor cabinets. Supabase: bookings joined with offer, vendor, profile. */
import { escrowOf } from "@/lib/payments/escrow";
import { useDB } from "../store";
import type { DB } from "../types";
import { bookingView } from "./_shared";

/** A vendor's bookings, newest first */
export const selectVendorBookings = (db: DB, vendorId: string) =>
  db.bookings
    .filter((b) => b.vendorId === vendorId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((b) => bookingView(db, b));
export const useVendorBookings = (vendorId: string) => useDB((db) => selectVendorBookings(db, vendorId));

/** Deals where the vendor still has to confirm (nav badge) */
export const useVendorToConfirm = (vendorId?: string) =>
  useDB((db) => db.bookings.filter((b) => b.vendorId === vendorId && escrowOf(b).state === "held" && !b.escrow?.vendorConfirmedAt).length);

/** A client's bookings, by event date */
export const selectClientBookings = (db: DB, clientId: string) =>
  db.bookings
    .filter((b) => b.clientId === clientId)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((b) => bookingView(db, b));
export const useClientBookings = (clientId: string) => useDB((db) => selectClientBookings(db, clientId));

/** The booking form: an offer with its vendor */
export const useOfferForBooking = (offerId: string) =>
  useDB((db) => {
    const offer = db.offers.find((o) => o.id === offerId);
    return { offer, vendor: offer ? db.vendors.find((v) => v.id === offer.vendorId) : undefined };
  });

/** Checkout: the client's own booking only (anything else reads as «not found») */
export const useCheckout = (clientId: string, bookingId: string) =>
  useDB((db) => {
    const b = db.bookings.find((x) => x.id === bookingId && x.clientId === clientId);
    if (!b) return { booking: undefined };
    return {
      booking: b,
      offer: db.offers.find((o) => o.id === b.offerId),
      vendor: db.vendors.find((v) => v.id === b.vendorId),
      conversationId: db.conversations.find((c) => c.bookingId === b.id)?.id,
    };
  });
