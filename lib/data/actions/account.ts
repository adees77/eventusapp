"use client";

/** Sign-up, profile and onboarding. */
import { assert, can, type Actor } from "../policies";
import { getDB } from "../store";
import { CATEGORY_PHOTOS, PHOTOS, unsplash } from "../seed/photos";
import type { CategoryId, ChecklistItem, EventItem, LText, Offer, Post, Role, User, Vendor, VendorSpecs } from "../types";
import { sanitizeSpecs } from "../specs";
import { asActor, currentActor, now, uid, update } from "./_core";
import { createEvent, setChecklist } from "./events";
import { DEFAULT_PREPAY_PERCENT } from "../seed/moderation";

// ── Sign-up & onboarding ──────────────────────────────────────

const CHECKLIST_TITLES: Record<CategoryId, string> = {
  halls: "Банкетный зал",
  cars: "Кортеж",
  hosts: "Ведущий",
  photo: "Фото и видео",
  decor: "Декор",
  music: "Музыка",
  furniture: "Мебель",
  cakes: "Торт",
  beauty: "Образ и визаж",
  attire: "Платье и костюм",
  traditional: "Той-атрибутика",
  shows: "Шоу-программа",
};

/** Finds a user by email or creates a fresh one that still has to go through onboarding */
export async function upsertAuthUser(input: {
  email: string;
  name?: string;
  provider: "google" | "email";
  /** Supabase Auth user id: the account keeps it, so stage 4 can move its data to the server as is */
  id?: string;
  /** profiles.role from Supabase (lib/auth/supabase.ts) — the only source of the admin role in live mode */
  serverAdmin?: boolean;
}): Promise<User> {
  const email = input.email.trim().toLowerCase();
  const db = getDB();
  const existing = input.id ? db.users.find((u) => u.id === input.id) : db.users.find((u) => u.email?.toLowerCase() === email);
  if (existing) {
    if (input.serverAdmin === undefined) return existing;
    const role: Role = input.serverAdmin ? "admin" : existing.role === "admin" ? "client" : existing.role;
    const next: User = { ...existing, role, name: existing.name || (input.name ?? "").trim().slice(0, 80), email, needsOnboarding: role === "admin" ? false : existing.needsOnboarding };
    update((d) => ({ ...d, users: d.users.map((u) => (u.id === existing.id ? next : u)) }));
    return next;
  }
  const user: User = {
    id: input.id ?? uid("u"),
    role: input.serverAdmin ? "admin" : "client",
    name: (input.name ?? "").trim().slice(0, 80),
    email,
    authProvider: input.provider,
    needsOnboarding: !input.serverAdmin,
    createdAt: now(),
  };
  update((d) => ({ ...d, users: [...d.users, user] }));
  return user;
}

export async function updateProfile(patch: { name?: string; city?: string; phone?: string }) {
  const actor = currentActor();
  assert(can.editProfile(actor, actor.id), "editProfile");
  update((d) => ({
    ...d,
    users: d.users.map((u) =>
      u.id === actor.id
        ? {
            ...u,
            ...(patch.name !== undefined && { name: patch.name.trim().slice(0, 80) }),
            ...(patch.city !== undefined && { city: patch.city }),
            ...(patch.phone !== undefined && { phone: patch.phone.trim().slice(0, 32) }),
          }
        : u,
    ),
  }));
}

function finishOnboarding(userId: string, role: "client" | "vendor") {
  update((d) => ({
    ...d,
    users: d.users.map((u) => (u.id === userId ? { ...u, role, needsOnboarding: false, onboardedAt: now() } : u)),
  }));
}

/** Client branch: creates the first event with a checklist ordered by what matters most */
export async function completeClientOnboarding(
  input: {
    name: string;
    city: string;
    event: { title: string; date: string; guests: number; budget: number };
    priorities: CategoryId[];
  },
): Promise<EventItem> {
  const actor = currentActor();
  const client: Actor = { id: actor.id, role: "client" };
  await updateProfile({ name: input.name, city: input.city });
  const e = await asActor(client, () => createEvent({ ...input.event, city: input.city }));
  const order: CategoryId[] = [...input.priorities, ...e.checklist.flatMap((c) => (c.category ? [c.category] : []))];
  const seen = new Set<CategoryId>();
  const checklist: ChecklistItem[] = order
    .filter((c) => !seen.has(c) && seen.add(c))
    .map((c, i) => ({ id: `c${i}`, title: CHECKLIST_TITLES[c], done: false, category: c }));
  await asActor(client, () => setChecklist(e.id, checklist));
  finishOnboarding(actor.id, "client");
  return { ...e, checklist };
}

/**
 * The whole vendor sign-up in ONE store update: profile, vendor with details and
 * photos, first service and first post, onboarding done. A single write leaves
 * nothing half-saved (another tab, a failed storage write, a closed tab) and also
 * finishes an earlier interrupted attempt by reusing the vendor it created.
 */
export async function signUpVendor(
  input: {
    ownerName: string;
    name: string;
    category: CategoryId;
    city: string;
    phone?: string;
    tagline: string;
    specs: VendorSpecs;
    photos: string[];
    offer: { title: string; price: number; unit: LText };
  },
): Promise<{ vendor: Vendor; offerId: string; postId: string }> {
  const actor = currentActor();
  assert(actor.role !== "admin", "signUpVendor");
  const db = getDB();
  const existing = db.vendors.find((v) => v.ownerId === actor.id);
  const name = input.name.trim().slice(0, 80);
  const tagline = input.tagline.trim().slice(0, 160);
  const stock = PHOTOS[CATEGORY_PHOTOS[input.category]];
  const photos = input.photos.slice(0, 10);
  const slugBase =
    name
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, "-")
      .replace(/^-|-$/g, "") || "vendor";
  const base: Vendor = existing ?? {
    id: uid("v"),
    ownerId: actor.id,
    slug: `${slugBase}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    category: input.category,
    city: input.city,
    tagline: { ru: tagline, en: tagline },
    description: { ru: "", en: "" },
    rating: 0,
    reviewsCount: 0,
    verified: false,
    // the platform may keep new vendors out of the catalog until their papers are checked
    hidden: !!db.settings?.hideUnverified,
    prepayPercent: db.settings?.defaultPrepayPercent ?? DEFAULT_PREPAY_PERCENT,
    cover: "",
    portfolio: [],
    phone: "",
    yearsOnMarket: 0,
    responseMinutes: 30,
    createdAt: now(),
    ordersBase: 0,
  };
  const portfolio = [...photos, ...stock.slice(0, 6).map((id) => unsplash(id, 1200))].filter((p, i, a) => a.indexOf(p) === i);
  const vendor: Vendor = {
    ...base,
    name,
    category: input.category,
    city: input.city,
    tagline: { ru: tagline, en: tagline },
    phone: input.phone?.trim().slice(0, 30) ?? base.phone,
    specs: sanitizeSpecs(input.category, input.specs),
    portfolio,
    cover: photos[0] ?? unsplash(stock[0], 1600, 900),
  };
  const offer: Offer = {
    id: uid("o"),
    vendorId: vendor.id,
    title: { ru: input.offer.title.trim().slice(0, 100), en: input.offer.title.trim().slice(0, 100) },
    description: { ru: tagline, en: tagline },
    price: Math.max(0, Math.round(input.offer.price)),
    unit: input.offer.unit,
    totalUnits: 1,
    photos: photos.slice(0, 2),
    active: true,
  };
  const post: Post = {
    id: uid("p"),
    vendorId: vendor.id,
    photos: photos.length ? photos : portfolio.slice(0, 3),
    caption: { ru: tagline, en: tagline },
    category: input.category,
    offerId: offer.id,
    baseLikes: 0,
    ratio: 1.25,
    createdAt: now(),
  };
  update((d) => ({
    ...d,
    users: d.users.map((u) =>
      u.id === actor.id
        ? {
            ...u,
            name: input.ownerName.trim().slice(0, 80) || u.name,
            city: input.city,
            ...(input.phone?.trim() && { phone: input.phone.trim().slice(0, 32) }),
            role: "vendor" as const,
            needsOnboarding: false,
            onboardedAt: now(),
          }
        : u,
    ),
    vendors: existing ? d.vendors.map((v) => (v.id === vendor.id ? vendor : v)) : [...d.vendors, vendor],
    stats: existing ? d.stats : [...d.stats, { vendorId: vendor.id, views: 0 }],
    offers: [...d.offers, offer],
    posts: [post, ...d.posts],
  }));
  return { vendor, offerId: offer.id, postId: post.id };
}
