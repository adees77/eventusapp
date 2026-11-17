"use client";

/** Vendor profile, offers, availability blocks, favorites and view stats; admin-created vendors. */
import { assert, can } from "../policies";
import { getDB } from "../store";
import type { CategoryId, LText, Offer, Vendor } from "../types";
import { currentActor, now, uid, update } from "./_core";
import { DEFAULT_PREPAY_PERCENT } from "../seed/moderation";

// ── Favorites & stats ─────────────────────────────────────────

export async function toggleFavorite(vendorId: string) {
  const actor = currentActor();
  assert(can.favorite(actor), "favorite");
  update((db) => {
    const has = db.favorites.some((f) => f.userId === actor.id && f.vendorId === vendorId);
    return {
      ...db,
      favorites: has
        ? db.favorites.filter((f) => !(f.userId === actor.id && f.vendorId === vendorId))
        : [...db.favorites, { userId: actor.id, vendorId }],
    };
  });
}

export async function trackView(vendorId: string) {
  update((db) => ({
    ...db,
    stats: db.stats.map((s) => (s.vendorId === vendorId ? { ...s, views: s.views + 1 } : s)),
  }));
}


// ── Vendor self-service ───────────────────────────────────────

export async function updateVendor(vendorId: string, patch: Partial<Vendor>) {
  const actor = currentActor();
  const db = getDB();
  const v = db.vendors.find((x) => x.id === vendorId)!;
  assert(can.editVendor(actor, v), "editVendor");
  // Only admin may change moderation fields
  const { hidden, verified, ownerId, id, verification, ...rest } = patch;
  void ownerId;
  void id;
  void verification;
  const safe: Partial<Vendor> = { ...rest };
  if (actor.role === "admin") {
    if (hidden !== undefined) safe.hidden = hidden;
    if (verified !== undefined) safe.verified = verified;
  }
  if (safe.prepayPercent !== undefined) safe.prepayPercent = Math.min(100, Math.max(0, Math.round(safe.prepayPercent)));
  update((d) => ({ ...d, vendors: d.vendors.map((x) => (x.id === vendorId ? { ...x, ...safe } : x)) }));
}

export async function upsertOffer(offer: Omit<Offer, "id"> & { id?: string }): Promise<string> {
  const actor = currentActor();
  const db = getDB();
  assert(can.editOffer(actor, db, offer), "editOffer");
  const id = offer.id ?? uid("o");
  const clean: Offer = {
    ...offer,
    id,
    price: Math.max(0, Math.round(offer.price)),
    totalUnits: Math.max(0, Math.round(offer.totalUnits)),
  };
  update((d) => ({
    ...d,
    offers: d.offers.some((o) => o.id === id) ? d.offers.map((o) => (o.id === id ? clean : o)) : [...d.offers, clean],
  }));
  return id;
}

export async function deleteOffer(offerId: string) {
  const actor = currentActor();
  const db = getDB();
  const o = db.offers.find((x) => x.id === offerId);
  if (!o) return;
  assert(can.editOffer(actor, db, o), "editOffer");
  // Keep history: offers with bookings are deactivated, not removed
  const hasBookings = db.bookings.some((b) => b.offerId === offerId);
  update((d) => ({
    ...d,
    offers: hasBookings
      ? d.offers.map((x) => (x.id === offerId ? { ...x, active: false } : x))
      : d.offers.filter((x) => x.id !== offerId),
  }));
}

export async function setBlockedUnits(offerId: string, date: string, units: number) {
  const actor = currentActor();
  const db = getDB();
  const offer = db.offers.find((o) => o.id === offerId)!;
  assert(can.editAvailability(actor, db, offer), "editAvailability");
  const clamped = Math.max(0, Math.min(offer.totalUnits, Math.round(units)));
  update((d) => {
    const rest = d.blocks.filter((b) => !(b.offerId === offerId && b.date === date));
    return { ...d, blocks: [...rest, { id: uid("bl"), offerId, date, units: clamped }] };
  });
}

// ── Admin ─────────────────────────────────────────────────────

export async function createVendor(
  input: { name: string; owner: string; category: CategoryId; city: string; tagline: LText; cover?: string },
): Promise<Vendor> {
  const actor = currentActor();
  assert(can.createVendor(actor), "createVendor");
  const slugBase =
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, "-")
      .replace(/^-|-$/g, "") || "vendor";
  const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;
  const ownerId = uid("u");
  const vendor: Vendor = {
    id: uid("v"),
    ownerId,
    slug,
    name: input.name.trim().slice(0, 80),
    category: input.category,
    city: input.city,
    tagline: input.tagline,
    description: { ru: "", en: "" },
    rating: 0,
    reviewsCount: 0,
    verified: false,
    hidden: false,
    prepayPercent: getDB().settings?.defaultPrepayPercent ?? DEFAULT_PREPAY_PERCENT,
    cover: input.cover ?? "",
    portfolio: input.cover ? [input.cover] : [],
    phone: "",
    yearsOnMarket: 0,
    responseMinutes: 30,
    createdAt: now(),
    specs: {},
    ordersBase: 0,
  };
  update((d) => ({
    ...d,
    users: [...d.users, { id: ownerId, role: "vendor", name: input.owner.trim().slice(0, 80) || input.name }],
    vendors: [...d.vendors, vendor],
    stats: [...d.stats, { vendorId: vendor.id, views: 0 }],
  }));
  return vendor;
}
