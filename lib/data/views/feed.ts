"use client";

/** The feed, a post card in the viewer, reviews. Supabase: a ranked feed RPC + per-post joins. */
import type { Actor } from "../policies";
import { feedItem, hadDealWith, ordersDone, reviewableBooking, searchPosts, similarPosts, type FeedFilters } from "../feed";
import { activeOffers, minPrice } from "../queries";
import { getDB, useDB } from "../store";
import type { Post, Vendor } from "../types";

export const useFeed = (filters: FeedFilters, actor: Actor | null) => useDB((db) => searchPosts(db, filters, actor));

/** All posts by id — the viewer keeps its own frozen order over them */
export const usePostIndex = () => useDB((db) => db.posts);

/** Non-reactive: ids of posts similar to `post` (button handler) */
export const readSimilarPosts = (post: Post, exclude: Set<string>) => similarPosts(getDB(), post, exclude);

/** Everything one slide of the viewer shows next to the post */
export const usePostCard = (post: Post, actor: Actor) =>
  useDB((db) => {
    const item = feedItem(db, post, actor);
    if (!item) return null;
    const offers = activeOffers(db, item.vendor.id);
    return {
      item,
      offers,
      offer: post.offerId ? offers.find((o) => o.id === post.offerId) : undefined,
      priceFrom: minPrice(offers),
      orders: ordersDone(db, item.vendor),
      categoryName: db.categories.find((c) => c.id === item.vendor.category)?.name,
    };
  });

export const useVendorReviews = (vendorId?: string) =>
  useDB((db) => db.reviews.filter((r) => r.vendorId === vendorId && !r.hidden).sort((a, b) => b.date.localeCompare(a.date)));

export const useOrdersDone = (vendor: Pick<Vendor, "id" | "ordersBase">) => useDB((db) => ordersDone(db, vendor));

/** Whether the signed-in client may review this vendor now (one review per finished deal) */
export const useReviewEligibility = (actor: Actor, vendorId: string) =>
  useDB((db) =>
    actor.role === "client"
      ? { booking: reviewableBooking(db, actor.id, vendorId), hadDeal: hadDealWith(db, actor.id, vendorId) }
      : { booking: undefined, hadDeal: false },
  );
