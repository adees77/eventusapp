"use client";

/**
 * Availability for calendars. Hooks return a lookup `(iso) => Availability` so a calendar
 * can ask per day; with Supabase the lookup reads one month fetched by an RPC.
 */
import { getAvailability, getVendorAvailability, type Availability } from "../availability";
import { useDB } from "../store";
import type { Offer } from "../types";

export type AvailabilityLookup = (iso: string) => Availability;

/** One offer, or the whole vendor when no offer is picked */
export const useAvailabilityLookup = (target: { offerId?: string | null; vendorId?: string }): AvailabilityLookup =>
  useDB((db) => {
    const offer = target.offerId ? db.offers.find((o) => o.id === target.offerId) : undefined;
    if (offer) return (iso: string) => getAvailability(db, offer, iso);
    return (iso: string) => (target.vendorId ? getVendorAvailability(db, target.vendorId, iso) : { total: 0, blocked: 0, booked: 0, free: 0 });
  });

/** Several offers at once: `(offer, iso) => Availability` */
export const useOffersAvailability = () => useDB((db) => (offer: Offer, iso: string) => getAvailability(db, offer, iso));
