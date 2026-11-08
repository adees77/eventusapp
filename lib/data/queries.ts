/**
 * Pure read helpers over the DB snapshot. Used by UI and by the AI tools,
 * so the assistant sees exactly what the catalog shows.
 */
import type { Actor } from "./policies";
import { can } from "./policies";
import { getAvailability, getVendorAvailability, type Availability } from "./availability";
import type { CategoryId, Conversation, DB, Offer, Vendor } from "./types";

export interface VendorFilters {
  category?: CategoryId | null;
  city?: string | null;
  date?: string | null;
  guests?: number | null;
  /** min units needed of a single offer on that date */
  qty?: number | null;
  budgetMax?: number | null;
  query?: string | null;
  sort?: "rating" | "priceAsc" | "priceDesc";
  /** hide vendors with nothing free on the date */
  onlyAvailable?: boolean;
}

export interface VendorResult {
  vendor: Vendor;
  minPrice: number;
  offers: Offer[];
  /** aggregate availability on filters.date (null if no date) */
  availability: Availability | null;
  /** best matching offer for qty/date, if any */
  bestOffer: Offer | null;
  bestOfferAvailability: Availability | null;
}

export const activeOffers = (db: DB, vendorId: string) => db.offers.filter((o) => o.vendorId === vendorId && o.active);

export function minPrice(offers: Offer[]) {
  return offers.length ? Math.min(...offers.map((o) => o.price)) : 0;
}

export function searchVendors(db: DB, f: VendorFilters, actor: Actor | null = null): VendorResult[] {
  const q = f.query?.trim().toLowerCase();
  let results: VendorResult[] = [];

  for (const vendor of db.vendors) {
    if (!can.viewVendor(actor, vendor)) continue;
    if (f.category && vendor.category !== f.category) continue;
    if (f.city && vendor.city !== f.city) continue;
    let offers = activeOffers(db, vendor.id);
    if (q) {
      const vendorMatch = `${vendor.name} ${vendor.tagline.ru} ${vendor.tagline.en}`.toLowerCase().includes(q);
      // a model/item query ("G-Class") narrows the offers themselves
      const offerMatches = offers.filter((o) => `${o.title.ru} ${o.title.en}`.toLowerCase().includes(q));
      if (offerMatches.length) offers = offerMatches;
      else if (!vendorMatch) continue;
    }
    if (f.guests && vendor.category === "halls") offers = offers.filter((o) => !o.capacity || o.capacity >= f.guests!);
    if (f.budgetMax) offers = offers.filter((o) => o.price * (f.qty ?? 1) <= f.budgetMax!);
    if (!offers.length) continue;

    let bestOffer: Offer | null = null;
    let bestOfferAvailability: Availability | null = null;
    let availability: Availability | null = null;

    if (f.date) {
      availability = getVendorAvailability(db, vendor.id, f.date);
      const need = f.qty ?? 1;
      const ranked = offers
        .map((o) => ({ o, a: getAvailability(db, o, f.date!) }))
        .filter(({ a }) => a.free >= need)
        .sort((x, y) => (y.o.premium ? 1 : 0) - (x.o.premium ? 1 : 0) || y.a.free - x.a.free);
      if (ranked[0]) {
        bestOffer = ranked[0].o;
        bestOfferAvailability = ranked[0].a;
      }
      if (f.onlyAvailable && !bestOffer) continue;
    }

    results.push({ vendor, minPrice: minPrice(offers), offers, availability, bestOffer, bestOfferAvailability });
  }

  const sort = f.sort ?? "rating";
  results = results.sort((a, b) => {
    if (sort === "priceAsc") return a.minPrice - b.minPrice;
    if (sort === "priceDesc") return b.minPrice - a.minPrice;
    // rating, then verified, then reviews
    return (
      b.vendor.rating - a.vendor.rating ||
      Number(b.vendor.verified) - Number(a.vendor.verified) ||
      b.vendor.reviewsCount - a.vendor.reviewsCount
    );
  });
  return results;
}

export const vendorBySlug = (db: DB, slug: string) => db.vendors.find((v) => v.slug === slug);
export const vendorById = (db: DB, id: string) => db.vendors.find((v) => v.id === id);
export const vendorOfOwner = (db: DB, ownerId: string) => db.vendors.find((v) => v.ownerId === ownerId);
export const offerById = (db: DB, id: string) => db.offers.find((o) => o.id === id);
export const userName = (db: DB, id: string) => db.users.find((u) => u.id === id)?.name ?? "";

export function conversationsFor(db: DB, actor: Actor): Conversation[] {
  return db.conversations
    .filter((c) => actor.role !== "admin" && can.viewConversation(actor, db, c))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function lastMessage(db: DB, conversationId: string) {
  let last;
  for (const m of db.messages) if (m.conversationId === conversationId && (!last || m.createdAt > last.createdAt)) last = m;
  return last;
}

export function isUnread(db: DB, c: Conversation, actorId: string) {
  const last = lastMessage(db, c.id);
  if (!last || last.senderId === actorId) return false;
  const read = c.readAt[actorId];
  return !read || last.createdAt > read;
}

export function unreadCount(db: DB, actor: Actor) {
  return conversationsFor(db, actor).filter((c) => isUnread(db, c, actor.id)).length;
}

/** Bookings visible to a vendor owner, newest first */
export function vendorBookings(db: DB, vendorId: string) {
  return db.bookings.filter((b) => b.vendorId === vendorId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
