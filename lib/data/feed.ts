/**
 * Feed queries: posts ranked like a social feed, filtered with the same
 * vendor filters as the catalog search (so the AI tools and the feed agree).
 */
import { hash } from "./availability";
import { isFinishedDeal, type Actor } from "./policies";
import { searchVendors, type VendorFilters } from "./queries";
import type { DB, Post, Vendor } from "./types";

export interface FeedFilters extends VendorFilters {
  /** «Высокий рейтинг»: well-rated vendors with a track record first */
  tab?: "foryou" | "top";
}

export interface FeedItem {
  post: Post;
  vendor: Vendor;
  likes: number;
  comments: number;
  liked: boolean;
  saved: boolean;
}

export const likeCount = (db: Pick<DB, "likes">, post: Post) => post.baseLikes + db.likes.filter((l) => l.postId === post.id).length;

export function feedItem(db: DB, post: Post, actor: Actor | null): FeedItem | null {
  const vendor = db.vendors.find((v) => v.id === post.vendorId);
  if (!vendor) return null;
  return {
    post,
    vendor,
    likes: likeCount(db, post),
    comments: db.comments.filter((c) => c.postId === post.id).length,
    liked: !!actor && db.likes.some((l) => l.userId === actor.id && l.postId === post.id),
    saved: !!actor && db.saved.some((l) => l.userId === actor.id && l.postId === post.id),
  };
}

/** Categories the client still needs for upcoming events → boosted in "for you" */
function interests(db: DB, actor: Actor | null): Set<string> {
  if (!actor || actor.role !== "client") return new Set();
  return new Set(
    db.events
      .filter((e) => e.clientId === actor.id)
      .flatMap((e) => e.checklist.filter((c) => !c.done && c.category).map((c) => c.category!)),
  );
}

export function searchPosts(db: DB, f: FeedFilters, actor: Actor | null, now = Date.now()): FeedItem[] {
  const vendorFilterActive = Boolean(f.category || f.city || f.date || f.budgetMax || f.guests);
  const q = f.query?.trim().toLowerCase();
  // the vendor set that passes the structured filters (query handled below so captions count too)
  const allowed = new Map(searchVendors(db, { ...f, query: null, onlyAvailable: !!f.date }, actor).map((r) => [r.vendor.id, r]));
  const boost = interests(db, actor);

  let posts = db.posts.filter((p) => !p.hidden && allowed.has(p.vendorId));
  if (f.tab === "top") posts = posts.filter((p) => (allowed.get(p.vendorId)!.vendor.rating ?? 0) >= 4.7);
  if (q) {
    posts = posts.filter((p) => {
      const v = allowed.get(p.vendorId)!.vendor;
      const cat = db.categories.find((c) => c.id === p.category);
      return `${v.name} ${v.tagline.ru} ${v.tagline.en} ${p.caption.ru} ${p.caption.en} ${cat?.name.ru} ${cat?.name.en}`
        .toLowerCase()
        .includes(q);
    });
  }

  const items = posts.flatMap((p) => feedItem(db, p, actor) ?? []);
  if (f.tab === "top") {
    const trust = (i: FeedItem) => i.vendor.rating * 10 + Math.log10(ordersDone(db, i.vendor) + 1);
    return spread(items.sort((a, b) => trust(b) - trust(a) || b.post.createdAt.localeCompare(a.post.createdAt)));
  }
  const sort = f.sort ?? "rating";
  if (vendorFilterActive && sort !== "rating") {
    const price = (id: string) => allowed.get(id)?.minPrice ?? 0;
    return items.sort((a, b) => (sort === "priceAsc" ? price(a.vendor.id) - price(b.vendor.id) : price(b.vendor.id) - price(a.vendor.id)));
  }
  // social ranking: freshness + popularity + quality + personal interest, with a stable shuffle
  const score = (i: FeedItem) => {
    const ageDays = (now - Date.parse(i.post.createdAt)) / 86400000;
    return (
      Math.log10(i.likes + 10) * 2 +
      i.vendor.rating +
      (i.vendor.verified ? 0.4 : 0) +
      (boost.has(i.post.category) ? 1.2 : 0) -
      ageDays / 20 +
      (hash(i.post.id) % 100) / 60
    );
  };
  return spread(
    items
      .map((i) => ({ i, s: score(i) }))
      .sort((a, b) => b.s - a.s)
      .map(({ i }) => i),
  );
}

/** Keeps the same vendor from appearing in a row: pulls the next different one forward (window of 4) */
function spread(items: FeedItem[], gap = 4): FeedItem[] {
  const rest = [...items];
  const out: FeedItem[] = [];
  while (rest.length) {
    const recent = new Set(out.slice(-gap).map((x) => x.vendor.id));
    const k = rest.findIndex((x) => !recent.has(x.vendor.id));
    out.push(rest.splice(k === -1 ? 0 : k, 1)[0]);
  }
  return out;
}

/**
 * What you scroll through after opening a post: the opened one first, then the
 * posts that follow it in the list it was opened from, then the ones before it.
 */
export function viewerSequence(order: string[], openedId: string): string[] {
  const i = order.indexOf(openedId);
  if (i === -1) return [openedId, ...order];
  return [...order.slice(i), ...order.slice(0, i)];
}

export function commentsOf(db: Pick<DB, "comments">, postId: string) {
  return db.comments.filter((c) => c.postId === postId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Orders a vendor has done: history before EVENTUS plus deals completed on the platform */
export function ordersDone(db: Pick<DB, "bookings">, vendor: Pick<Vendor, "id" | "ordersBase">) {
  return (
    (vendor.ordersBase ?? 0) +
    db.bookings.filter((b) => b.vendorId === vendor.id && isFinishedDeal(b)).length
  );
}

/** A client's finished booking with this vendor that has no review yet → they may rate it */
export function reviewableBooking(db: Pick<DB, "bookings" | "reviews">, clientId: string, vendorId: string) {
  return db.bookings.find(
    (b) =>
      b.clientId === clientId &&
      b.vendorId === vendorId &&
      isFinishedDeal(b) &&
      !db.reviews.some((r) => r.bookingId === b.id),
  );
}

/** Has this client ever had a finished deal with the vendor (and so may comment and review) */
export function hadDealWith(db: Pick<DB, "bookings">, clientId: string, vendorId: string) {
  return db.bookings.some((b) => b.clientId === clientId && b.vendorId === vendorId && isFinishedDeal(b));
}
