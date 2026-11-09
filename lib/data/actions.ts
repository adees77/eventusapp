"use client";

/**
 * All writes go through here. Each action checks lib/data/policies.ts
 * before touching the store — the same rules RLS enforces in Supabase.
 * Swap the bodies for supabase-js calls when moving to a real backend.
 */
import { demoConfig } from "@/config/demo";
import { getAvailability } from "./availability";
import { assert, can, type Actor } from "./policies";
import { getDB, useDataStore } from "./store";
import type { Booking, CategoryId, ChecklistItem, EventItem, Invitation, InvitationRsvp, LText, Message, Offer, Vendor } from "./types";

const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const now = () => new Date().toISOString();
const update = useDataStore.getState().update;

// ── Favorites & stats ─────────────────────────────────────────

export function toggleFavorite(actor: Actor, vendorId: string) {
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

export function trackView(vendorId: string) {
  update((db) => ({
    ...db,
    stats: db.stats.map((s) => (s.vendorId === vendorId ? { ...s, views: s.views + 1 } : s)),
  }));
}

// ── Bookings ──────────────────────────────────────────────────

export class AvailabilityError extends Error {
  constructor(public free: number) {
    super("Not enough units available");
  }
}

export function createBooking(
  actor: Actor,
  input: { offerId: string; date: string; qty: number; eventId?: string; note?: string },
): Booking {
  const db = getDB();
  assert(can.createBooking(actor, actor.id), "createBooking");
  const offer = db.offers.find((o) => o.id === input.offerId);
  if (!offer || !offer.active) throw new Error("Offer not found");
  const vendor = db.vendors.find((v) => v.id === offer.vendorId)!;
  const qty = Math.max(1, Math.floor(input.qty));
  const { free } = getAvailability(db, offer, input.date);
  if (free < qty) throw new AvailabilityError(free);

  const total = offer.price * qty;
  const booking: Booking = {
    id: uid("b"),
    offerId: offer.id,
    vendorId: vendor.id,
    clientId: actor.id,
    eventId: input.eventId,
    date: input.date,
    qty,
    total,
    prepayAmount: Math.round((total * vendor.prepayPercent) / 100),
    status: "pending",
    note: input.note?.slice(0, 500),
    createdAt: now(),
  };
  update((d) => ({ ...d, bookings: [...d.bookings, booking] }));
  return booking;
}

/** Called after the payment provider confirms. Returns the conversation id. */
export function markBookingPrepaid(actor: Actor, bookingId: string, paymentRef: string): string {
  const db = getDB();
  const b = db.bookings.find((x) => x.id === bookingId);
  if (!b) throw new Error("Booking not found");
  assert(can.payBooking(actor, b), "payBooking");

  // Re-check: the pending booking already holds units, so validate excluding itself
  const offer = db.offers.find((o) => o.id === b.offerId)!;
  const others = { blocks: db.blocks, bookings: db.bookings.filter((x) => x.id !== b.id) };
  const { free } = getAvailability(others, offer, b.date);
  if (free < b.qty) throw new AvailabilityError(free);

  const conversationId = ensureConversation(actor, b.vendorId, b.id);
  update((d) => ({
    ...d,
    bookings: d.bookings.map((x) => (x.id === b.id ? { ...x, status: "prepaid", paymentRef } : x)),
    events: d.events.map((e) => (e.id === b.eventId ? checkCategory(e, d.vendors.find((v) => v.id === b.vendorId)?.category) : e)),
  }));
  addSystemMessage(conversationId, "booking_prepaid");
  return conversationId;
}

function checkCategory(e: EventItem, category?: CategoryId): EventItem {
  if (!category) return e;
  return { ...e, checklist: e.checklist.map((c) => (c.category === category ? { ...c, done: true } : c)) };
}

export function setBookingStatus(actor: Actor, bookingId: string, status: Booking["status"]) {
  const db = getDB();
  const b = db.bookings.find((x) => x.id === bookingId);
  if (!b) throw new Error("Booking not found");
  assert(can.setBookingStatus(actor, db, b, status), "setBookingStatus");
  update((d) => ({ ...d, bookings: d.bookings.map((x) => (x.id === bookingId ? { ...x, status } : x)) }));
  const conv = db.conversations.find((c) => c.bookingId === bookingId);
  if (conv && (status === "confirmed" || status === "cancelled")) {
    addSystemMessage(conv.id, status === "confirmed" ? "booking_confirmed" : "booking_cancelled");
  }
}

// ── Messaging ─────────────────────────────────────────────────

/** Find or create the conversation between a client and a vendor (optionally for a booking). */
export function ensureConversation(actor: Actor, vendorId: string, bookingId?: string): string {
  const db = getDB();
  const clientId = actor.role === "client" ? actor.id : db.bookings.find((b) => b.id === bookingId)?.clientId;
  if (!clientId) throw new Error("No client for conversation");
  const existing =
    db.conversations.find((c) => bookingId && c.bookingId === bookingId) ??
    db.conversations.find((c) => c.clientId === clientId && c.vendorId === vendorId && (!bookingId || !c.bookingId));
  if (existing) {
    if (bookingId && !existing.bookingId) {
      update((d) => ({
        ...d,
        conversations: d.conversations.map((c) => (c.id === existing.id ? { ...c, bookingId } : c)),
      }));
    }
    return existing.id;
  }
  const id = uid("c");
  const ts = now();
  update((d) => ({
    ...d,
    conversations: [...d.conversations, { id, clientId, vendorId, bookingId, createdAt: ts, updatedAt: ts, readAt: {} }],
  }));
  return id;
}

function pushMessage(m: Message) {
  update((d) => ({
    ...d,
    messages: [...d.messages, m],
    conversations: d.conversations.map((c) =>
      c.id === m.conversationId
        ? { ...c, updatedAt: m.createdAt, readAt: m.system ? c.readAt : { ...c.readAt, [m.senderId]: m.createdAt } }
        : c,
    ),
  }));
}

export function addSystemMessage(conversationId: string, code: string) {
  pushMessage({ id: uid("m"), conversationId, senderId: "system", text: code, system: true, createdAt: now() });
}

export function sendMessage(actor: Actor, conversationId: string, text: string) {
  const db = getDB();
  const c = db.conversations.find((x) => x.id === conversationId);
  if (!c) throw new Error("Conversation not found");
  assert(can.sendMessage(actor, db, c), "sendMessage");
  const clean = text.trim().slice(0, 4000);
  if (!clean) return;
  pushMessage({ id: uid("m"), conversationId, senderId: actor.id, text: clean, createdAt: now() });
}

/** DEMO: vendor answers automatically so a solo presenter sees a live chat */
export function sendAutoReply(conversationId: string, text: string) {
  if (!demoConfig.vendorAutoReply) return;
  const db = getDB();
  const c = db.conversations.find((x) => x.id === conversationId);
  const v = c && db.vendors.find((x) => x.id === c.vendorId);
  if (!c || !v) return;
  pushMessage({ id: uid("m"), conversationId, senderId: v.ownerId, text, createdAt: now() });
}

export function markRead(actorId: string, conversationId: string) {
  const ts = now();
  update((d) => ({
    ...d,
    conversations: d.conversations.map((c) =>
      c.id === conversationId ? { ...c, readAt: { ...c.readAt, [actorId]: ts } } : c,
    ),
  }));
}

// ── Vendor self-service ───────────────────────────────────────

export function updateVendor(actor: Actor, vendorId: string, patch: Partial<Vendor>) {
  const db = getDB();
  const v = db.vendors.find((x) => x.id === vendorId)!;
  assert(can.editVendor(actor, v), "editVendor");
  // Only admin may change moderation fields
  const { hidden, verified, ownerId, id, ...rest } = patch;
  void ownerId;
  void id;
  const safe: Partial<Vendor> = { ...rest };
  if (actor.role === "admin") {
    if (hidden !== undefined) safe.hidden = hidden;
    if (verified !== undefined) safe.verified = verified;
  }
  if (safe.prepayPercent !== undefined) safe.prepayPercent = Math.min(100, Math.max(0, Math.round(safe.prepayPercent)));
  update((d) => ({ ...d, vendors: d.vendors.map((x) => (x.id === vendorId ? { ...x, ...safe } : x)) }));
}

export function upsertOffer(actor: Actor, offer: Omit<Offer, "id"> & { id?: string }): string {
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

export function deleteOffer(actor: Actor, offerId: string) {
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

export function setBlockedUnits(actor: Actor, offerId: string, date: string, units: number) {
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

export function createVendor(
  actor: Actor,
  input: { name: string; owner: string; category: CategoryId; city: string; tagline: LText; cover?: string },
): Vendor {
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
    prepayPercent: demoConfig.defaultPrepayPercent,
    cover: input.cover ?? "",
    portfolio: input.cover ? [input.cover] : [],
    phone: "",
    yearsOnMarket: 0,
    responseMinutes: 30,
    createdAt: now(),
  };
  update((d) => ({
    ...d,
    users: [...d.users, { id: ownerId, role: "vendor", name: input.owner.trim().slice(0, 80) || input.name }],
    vendors: [...d.vendors, vendor],
    stats: [...d.stats, { vendorId: vendor.id, views: 0 }],
  }));
  return vendor;
}

// ── Client events ─────────────────────────────────────────────

export function createEvent(actor: Actor, input: Omit<EventItem, "id" | "clientId" | "createdAt" | "checklist">) {
  assert(can.manageEvent(actor, actor.id), "manageEvent");
  const defaults: { title: string; category: CategoryId }[] = [
    { title: "Банкетный зал", category: "halls" },
    { title: "Кортеж", category: "cars" },
    { title: "Ведущий", category: "hosts" },
    { title: "Фото и видео", category: "photo" },
    { title: "Декор", category: "decor" },
  ];
  const e: EventItem = {
    ...input,
    id: uid("e"),
    clientId: actor.id,
    createdAt: now(),
    checklist: defaults.map((x, i) => ({ id: `c${i}`, done: false, ...x })),
  };
  update((d) => ({ ...d, events: [...d.events, e] }));
  return e;
}

export function updateEvent(actor: Actor, eventId: string, patch: Partial<EventItem>) {
  const e = getDB().events.find((x) => x.id === eventId);
  if (!e) return;
  assert(can.manageEvent(actor, e.clientId), "manageEvent");
  update((d) => ({ ...d, events: d.events.map((x) => (x.id === eventId ? { ...x, ...patch, id: x.id, clientId: x.clientId } : x)) }));
}

export function setChecklist(actor: Actor, eventId: string, checklist: ChecklistItem[]) {
  updateEvent(actor, eventId, { checklist });
}

// ── Invitations ───────────────────────────────────────────────

type InvitationInput = Omit<Invitation, "id" | "ownerId" | "rsvps" | "createdAt" | "updatedAt">;

export function createInvitation(actor: Actor, input: InvitationInput): Invitation {
  assert(can.manageInvitation(actor, actor.id), "manageInvitation");
  const inv: Invitation = { ...input, id: uid("inv"), ownerId: actor.id, rsvps: [], createdAt: now(), updatedAt: now() };
  update((d) => ({ ...d, invitations: [...d.invitations, inv] }));
  return inv;
}

export function updateInvitation(actor: Actor, id: string, patch: Partial<InvitationInput>) {
  const inv = getDB().invitations.find((x) => x.id === id);
  if (!inv) return;
  assert(can.manageInvitation(actor, inv.ownerId), "manageInvitation");
  update((d) => ({
    ...d,
    invitations: d.invitations.map((x) => (x.id === id ? { ...x, ...patch, id: x.id, ownerId: x.ownerId, rsvps: x.rsvps, updatedAt: now() } : x)),
  }));
}

export function duplicateInvitation(actor: Actor, id: string): Invitation | undefined {
  const inv = getDB().invitations.find((x) => x.id === id);
  if (!inv) return;
  assert(can.manageInvitation(actor, inv.ownerId), "manageInvitation");
  return createInvitation(actor, {
    eventId: inv.eventId,
    templateId: inv.templateId,
    style: inv.style,
    occasion: inv.occasion,
    heading: inv.heading,
    names: inv.names,
    message: inv.message,
    date: inv.date,
    time: inv.time,
    venue: inv.venue,
    address: inv.address,
    dressCode: inv.dressCode,
    contact: inv.contact,
    photo: inv.photo,
  });
}

export function deleteInvitation(actor: Actor, id: string) {
  const inv = getDB().invitations.find((x) => x.id === id);
  if (!inv) return;
  assert(can.manageInvitation(actor, inv.ownerId), "manageInvitation");
  update((d) => ({ ...d, invitations: d.invitations.filter((x) => x.id !== id) }));
}

/** Public: anyone with the link can answer. One answer per name (latest wins). */
export function submitRsvp(invitationId: string, input: Omit<InvitationRsvp, "id" | "createdAt">) {
  const name = input.name.trim().slice(0, 80);
  if (!name) throw new Error("Name required");
  const rsvp: InvitationRsvp = {
    id: uid("r"),
    name,
    attending: input.attending,
    guests: input.attending ? Math.min(10, Math.max(1, Math.floor(input.guests))) : 0,
    note: input.note?.trim().slice(0, 300) || undefined,
    createdAt: now(),
  };
  update((d) => ({
    ...d,
    invitations: d.invitations.map((x) =>
      x.id === invitationId
        ? { ...x, rsvps: [...x.rsvps.filter((r) => r.name.toLowerCase() !== name.toLowerCase()), rsvp] }
        : x,
    ),
  }));
  return rsvp;
}
