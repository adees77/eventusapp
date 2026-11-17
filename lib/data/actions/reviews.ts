"use client";

/** Reviews, vendor replies, moderation of reviews. */
import { assert, can, isFinishedDeal } from "../policies";
import { getDB } from "../store";
import { currentActor, now, uid, update } from "./_core";
import { notify } from "./notifications";
import { routes } from "@/lib/routes";

// ── Reviews ───────────────────────────────────────────────────

/** Client leaves a review once the booking is completed (one per booking) */
export async function leaveReview(bookingId: string, rating: number, text: string) {
  const actor = currentActor();
  const db = getDB();
  const b = db.bookings.find((x) => x.id === bookingId);
  assert(!!b && b.clientId === actor.id && isFinishedDeal(b), "leaveReview");
  if (db.reviews.some((r) => r.bookingId === bookingId)) return;
  const clean = text.trim().slice(0, 1000);
  const r = Math.min(5, Math.max(1, Math.round(rating)));
  const author = db.users.find((u) => u.id === actor.id)?.name || "Клиент";
  update((d) => {
    const vendor = d.vendors.find((v) => v.id === b.vendorId)!;
    const count = vendor.reviewsCount + 1;
    const avg = Math.round(((vendor.rating * vendor.reviewsCount + r) / count) * 10) / 10;
    return {
      ...d,
      reviews: [{ id: uid("r"), vendorId: b.vendorId, bookingId, authorId: actor.id, author, rating: r, text: { ru: clean, en: clean }, date: now().slice(0, 10) }, ...d.reviews],
      vendors: d.vendors.map((v) => (v.id === b.vendorId ? { ...v, rating: avg, reviewsCount: count } : v)),
    };
  });
  const v = db.vendors.find((x) => x.id === b.vendorId);
  if (v) notify(v.ownerId, "review", { ru: `Новый отзыв: ${r} из 5`, en: `New review: ${r} of 5` }, routes.vendor(v.slug, "reviews"));
}

export async function replyToReview(reviewId: string, text: string) {
  const actor = currentActor();
  const db = getDB();
  const r = db.reviews.find((x) => x.id === reviewId);
  const v = r && db.vendors.find((x) => x.id === r.vendorId);
  assert(!!v && can.editVendor(actor, v), "replyReview");
  const clean = text.trim().slice(0, 1000);
  update((d) => ({ ...d, reviews: d.reviews.map((x) => (x.id === reviewId ? { ...x, reply: clean ? { text: clean, date: now().slice(0, 10) } : undefined } : x)) }));
}

export async function setReviewHidden(reviewId: string, hidden: boolean) {
  const actor = currentActor();
  assert(actor.role === "admin", "moderateReview");
  update((d) => ({ ...d, reviews: d.reviews.map((x) => (x.id === reviewId ? { ...x, hidden } : x)) }));
}
