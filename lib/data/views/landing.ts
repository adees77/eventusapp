"use client";

/** Numbers and samples on the landing page. Supabase: one public RPC / cached view. */
import { getVendorAvailability } from "../availability";
import { activeOffers, minPrice } from "../queries";
import { useDB } from "../store";
import { buildSeed } from "../seed";
import type { CategoryId, DB, Invitation, Locale } from "../types";

const shown = (db: DB) => db.vendors.filter((v) => v.verified && !v.hidden);

export function selectLandingStats(db: DB) {
  const rated = db.vendors.filter((v) => v.reviewsCount > 0);
  return {
    verified: shown(db).length,
    avgRating: rated.length ? rated.reduce((s, v) => s + v.rating, 0) / rated.length : 4.9,
    reviewsCount: db.reviews.length,
  };
}
export const useLandingStats = () => useDB(selectLandingStats);

/** One verified vendor per category, with its starting price */
export const selectShowcase = (db: DB, cats: CategoryId[]) =>
  cats.flatMap((cat) => {
    const vendor = shown(db).find((v) => v.category === cat);
    return vendor ? [{ vendor, priceFrom: minPrice(activeOffers(db, vendor.id)) }] : [];
  });
export const useShowcase = (cats: CategoryId[]) => useDB((db) => selectShowcase(db, cats));

/** The «any device» mock: a verified car vendor and its availability on a date */
export function selectDeviceMock(db: DB, date: string) {
  const vendor = shown(db).find((v) => v.category === "cars") ?? db.vendors[0];
  return {
    vendor,
    priceFrom: vendor ? minPrice(activeOffers(db, vendor.id)) : 0,
    availability: vendor ? getVendorAvailability(db, vendor.id, date) : { total: 0, blocked: 0, booked: 0, free: 0 },
    authors: db.reviews.slice(0, 3).map((r) => r.author),
  };
}
export const useDeviceMock = (date: string) => useDB((db) => selectDeviceMock(db, date));

/** Typical price of a category: median of each vendor's cheapest fitting offer (halls must seat the guests) */
export function typicalPrice(db: DB, cat: CategoryId, guests = 0) {
  const prices = db.vendors
    .filter((v) => v.category === cat && !v.hidden)
    .map((v) => minPrice(activeOffers(db, v.id).filter((o) => !o.capacity || o.capacity >= guests)))
    .filter((p) => Number.isFinite(p) && p > 0)
    .sort((a, b) => a - b);
  return prices.length ? prices[Math.floor(prices.length / 2)] : 0;
}

/** Package budget from catalog prices, rounded to 10 000 */
export const usePackageBudgets = (packages: { cats: CategoryId[]; guests: number; cars: number }[]) =>
  useDB((db) =>
    packages.map((p) => {
      const sum = p.cats.reduce((s, c) => s + typicalPrice(db, c, p.guests), 0) + typicalPrice(db, "cars") * p.cars;
      return Math.round(sum / 10000) * 10000;
    }),
  );

/** Five-star reviews with enough text to quote */
export const useQuotableReviews = (locale: Locale) =>
  useDB((db) =>
    db.reviews
      .filter((r) => !r.hidden && r.rating >= 5 && (r.text[locale] ?? r.text.ru).length > 40)
      .slice(0, 9)
      .map((r) => ({ review: r, vendorName: db.vendors.find((v) => v.id === r.vendorId)?.name ?? "" })),
  );

let sampleInvitation: Invitation | undefined;
/** An invitation to show on the landing: the visitor's own, else the demo's sample (live mode has none) */
export const useFirstInvitation = () => useDB((db) => db.invitations[0]) ?? (sampleInvitation ??= buildSeed().invitations[0]);
