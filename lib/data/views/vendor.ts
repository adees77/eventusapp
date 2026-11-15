"use client";

/** The vendor cabinet (/vendor/*, /create/*). Supabase: queries scoped by owns_vendor(). */
import { useActor } from "@/lib/session";
import { vendorBalance } from "@/lib/payments/escrow";
import { likeCount, ordersDone } from "../feed";
import { activeOffers, vendorOfOwner } from "../queries";
import { useDB } from "../store";
import type { DB } from "../types";
import { nameOf } from "./_shared";
import { selectVendorBookings } from "./bookings";

/** The signed-in user's own vendor profile, if any */
export const useOwnVendor = () => {
  const actor = useActor();
  return useDB((db) => vendorOfOwner(db, actor.id));
};

/** An offer of the signed-in vendor (a stale or foreign id gives null) */
export const useOwnOffer = (offerId: string | null) => {
  const actor = useActor();
  return useDB((db) => {
    const mine = vendorOfOwner(db, actor.id);
    return (offerId && mine && db.offers.find((o) => o.id === offerId && o.vendorId === mine.id)) || null;
  });
};

export function selectVendorOverview(db: DB, vendorId: string) {
  const vendor = db.vendors.find((v) => v.id === vendorId)!;
  const posts = db.posts.filter((p) => p.vendorId === vendorId);
  const offerIds = new Set(db.offers.filter((o) => o.vendorId === vendorId).map((o) => o.id));
  return {
    bookings: selectVendorBookings(db, vendorId),
    balance: vendorBalance(vendorId, db.bookings, db.transactions),
    views: db.stats.find((s) => s.vendorId === vendorId)?.views ?? 0,
    postsCount: posts.length,
    likes: posts.reduce((s, p) => s + likeCount(db, p), 0),
    ordersDone: ordersDone(db, vendor),
    /** reviews of real deals still waiting for the vendor's reply */
    unanswered: db.reviews.filter((r) => r.vendorId === vendorId && r.bookingId && !r.reply),
    activeOffers: activeOffers(db, vendorId).length,
    hasBlocks: db.blocks.some((b) => offerIds.has(b.offerId)),
  };
}
export const useVendorOverview = (vendorId: string) => useDB((db) => selectVendorOverview(db, vendorId));

export function selectVendorFinance(db: DB, vendorId: string) {
  return {
    balance: vendorBalance(vendorId, db.bookings, db.transactions),
    feePercent: db.settings.feePercent,
    rows: db.transactions
      .filter((x) => x.vendorId === vendorId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((x) => ({ tx: x, clientName: nameOf(db, x.clientId) })),
  };
}
export const useVendorFinance = (vendorId: string) => useDB((db) => selectVendorFinance(db, vendorId));

export function selectVendorPosts(db: DB, vendorId: string) {
  return {
    rows: db.posts
      .filter((p) => p.vendorId === vendorId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((p) => ({ post: p, likes: likeCount(db, p) })),
    offers: activeOffers(db, vendorId),
  };
}
export const useVendorPosts = (vendorId: string) => useDB((db) => selectVendorPosts(db, vendorId));

/** All offers of a vendor, active or not (services editor) */
export const useVendorOffers = (vendorId: string) => useDB((db) => db.offers.filter((o) => o.vendorId === vendorId));
export const useActiveOffers = (vendorId: string) => useDB((db) => activeOffers(db, vendorId));

/** Any vendor by id (public fields) */
export const useVendor = (id?: string) => useDB((db) => (id ? db.vendors.find((v) => v.id === id) : undefined));
/** Whether the signed-in client saved this vendor */
export const useIsFavorite = (userId: string, vendorId: string) =>
  useDB((db) => db.favorites.some((f) => f.userId === userId && f.vendorId === vendorId));

/** The public vendor page; the owner also sees switched-off services so they can be edited and turned back on */
export const useVendorProfile = (slug: string, viewerId: string) =>
  useDB((db) => {
    const vendor = db.vendors.find((v) => v.slug === slug);
    if (!vendor) return { vendor: undefined, offers: [], posts: [], orders: 0, favorite: false };
    return {
      vendor,
      category: db.categories.find((c) => c.id === vendor.category),
      offers: vendor.ownerId === viewerId ? db.offers.filter((o) => o.vendorId === vendor.id) : activeOffers(db, vendor.id),
      posts: db.posts.filter((p) => p.vendorId === vendor.id && !p.hidden).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      orders: ordersDone(db, vendor),
      favorite: db.favorites.some((f) => f.userId === viewerId && f.vendorId === vendor.id),
    };
  });
