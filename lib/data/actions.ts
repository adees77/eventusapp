"use client";

/**
 * All writes go through here. Each action checks lib/data/policies.ts
 * before touching the store — the same rules RLS enforces in Supabase.
 * Swap the bodies for supabase-js calls when moving to a real backend.
 */
import { demoConfig } from "@/config/demo";
import { getAvailability } from "./availability";
import { assert, can, isFinishedDeal, type Actor } from "./policies";
import { getDB, useDataStore } from "./store";
import * as escrow from "@/lib/payments/escrow";
import { CATEGORY_PHOTOS, PHOTOS, unsplash } from "./seed/photos";
import type {
  AppNotification,
  Booking,
  CategoryId,
  ChecklistItem,
  EventItem,
  Invitation,
  InvitationGuest,
  InvitationRsvp,
  LText,
  Message,
  NotificationKind,
  Offer,
  PlatformSettings,
  Post,
  PostComment,
  Transaction,
  Vendor,
  VendorSpecs,
} from "./types";
import { sanitizeSpecs } from "./specs";

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
  const t = escrow.hold(b, now());
  update((d) => ({
    ...d,
    bookings: d.bookings.map((x) => (x.id === b.id ? { ...x, status: t.status, escrow: t.escrow, paymentRef } : x)),
    transactions: [...d.transactions, ...ledger(t.ledger)],
    events: d.events.map((e) => (e.id === b.eventId ? checkCategory(e, d.vendors.find((v) => v.id === b.vendorId)?.category) : e)),
  }));
  addSystemMessage(conversationId, "escrow_held");
  const vendor = db.vendors.find((v) => v.id === b.vendorId);
  if (vendor) notify(vendor.ownerId, "booking_new", { ru: "Новая бронь: предоплата заморожена до подтверждения сделки", en: "New booking: prepayment is frozen until the deal is confirmed" }, `/messages/${conversationId}`);
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
  // cancelling a booking with frozen money always refunds the client
  if (status === "cancelled" && b.escrow?.state === "held") return cancelDeal(actor, bookingId);
  update((d) => ({ ...d, bookings: d.bookings.map((x) => (x.id === bookingId ? { ...x, status } : x)) }));
  const conv = db.conversations.find((c) => c.bookingId === bookingId);
  if (conv && (status === "confirmed" || status === "cancelled" || status === "completed")) {
    addSystemMessage(conv.id, `booking_${status}`);
  }
  notify(b.clientId, "booking_status", { ru: "Статус брони обновлён", en: "Booking status updated" }, conv ? `/messages/${conv.id}` : "/dashboard/bookings");
}

// ── P2P escrow ────────────────────────────────────────────────

function ledger(entries: Omit<Transaction, "id" | "createdAt">[]): Transaction[] {
  const ts = now();
  return entries.map((e) => ({ ...e, id: uid("tx"), createdAt: ts }));
}

function partyOf(actor: Actor, b: Booking): escrow.Party {
  if (actor.id === b.clientId) return "client";
  const v = getDB().vendors.find((x) => x.id === b.vendorId);
  if (v && v.ownerId === actor.id) return "vendor";
  throw new escrow.EscrowError("party");
}

function applyTransition(bookingId: string, t: escrow.Transition) {
  update((d) => ({
    ...d,
    bookings: d.bookings.map((x) => (x.id === bookingId ? { ...x, escrow: t.escrow, status: t.status } : x)),
    transactions: t.ledger.length ? [...d.transactions, ...ledger(t.ledger)] : d.transactions,
  }));
}

function dealParties(b: Booking) {
  const db = getDB();
  const v = db.vendors.find((x) => x.id === b.vendorId);
  const conv = db.conversations.find((c) => c.bookingId === b.id);
  return { vendorOwner: v?.ownerId, href: conv ? `/messages/${conv.id}` : undefined, convId: conv?.id };
}

/** «Подтвердить сделку». Releases the money when both sides have confirmed. */
export function confirmDeal(actor: Actor, bookingId: string) {
  const db = getDB();
  const b = db.bookings.find((x) => x.id === bookingId);
  if (!b) throw new Error("Booking not found");
  const party = partyOf(actor, b);
  const t = escrow.confirm(b, party, now(), db.settings.feePercent);
  applyTransition(b.id, t);
  const { vendorOwner, href, convId } = dealParties(b);
  const other = party === "client" ? vendorOwner : b.clientId;
  if (t.escrow.state === "released") {
    if (convId) addSystemMessage(convId, "escrow_released");
    for (const u of [b.clientId, vendorOwner]) {
      if (u) notify(u, "escrow_released", { ru: "Сделка подтверждена обеими сторонами, деньги переведены исполнителю", en: "Both sides confirmed: money was transferred to the vendor" }, href);
    }
  } else {
    if (convId) addSystemMessage(convId, `escrow_confirmed_${party}`);
    if (other) notify(other, "escrow_confirm", { ru: "Вторая сторона подтвердила сделку — осталось ваше подтверждение", en: "The other side confirmed the deal — your confirmation is next" }, href);
  }
  return t.escrow;
}

export function unconfirmDeal(actor: Actor, bookingId: string) {
  const b = getDB().bookings.find((x) => x.id === bookingId);
  if (!b) throw new Error("Booking not found");
  applyTransition(b.id, escrow.unconfirm(b, partyOf(actor, b)));
}

/** Cancel before both confirmed → full refund of the frozen prepayment */
export function cancelDeal(actor: Actor, bookingId: string) {
  const b = getDB().bookings.find((x) => x.id === bookingId);
  if (!b) throw new Error("Booking not found");
  if (actor.role !== "admin") partyOf(actor, b);
  applyTransition(b.id, escrow.refund(b, now()));
  const { vendorOwner, href, convId } = dealParties(b);
  if (convId) addSystemMessage(convId, "escrow_refunded");
  for (const u of [b.clientId, vendorOwner]) {
    if (u) notify(u, "escrow_refunded", { ru: "Бронь отменена, предоплата возвращена клиенту", en: "Booking cancelled, the prepayment was returned to the client" }, href);
  }
}

export function openDispute(actor: Actor, bookingId: string, reason: string) {
  const b = getDB().bookings.find((x) => x.id === bookingId);
  if (!b) throw new Error("Booking not found");
  partyOf(actor, b);
  applyTransition(b.id, escrow.openDispute(b, actor.id, reason, now()));
  const { vendorOwner, href, convId } = dealParties(b);
  if (convId) addSystemMessage(convId, "escrow_disputed");
  const text = { ru: "Открыт спор по сделке — деньги заморожены до решения EVENTUS", en: "A dispute was opened — money stays frozen until EVENTUS decides" };
  for (const u of [b.clientId, vendorOwner, ...getDB().users.filter((x) => x.role === "admin").map((x) => x.id)]) {
    if (u) notify(u, "escrow_disputed", text, u.startsWith("u-admin") ? "/admin/disputes" : href);
  }
}

export function resolveDispute(actor: Actor, bookingId: string, resolution: "release" | "refund") {
  assert(actor.role === "admin", "resolveDispute");
  const db = getDB();
  const b = db.bookings.find((x) => x.id === bookingId);
  if (!b) throw new Error("Booking not found");
  applyTransition(b.id, escrow.resolveDispute(b, resolution, now(), db.settings.feePercent));
  const { vendorOwner, href, convId } = dealParties(b);
  if (convId) addSystemMessage(convId, resolution === "release" ? "escrow_released" : "escrow_refunded");
  const text =
    resolution === "release"
      ? { ru: "Спор решён: деньги переведены исполнителю", en: "Dispute resolved: money released to the vendor" }
      : { ru: "Спор решён: предоплата возвращена клиенту", en: "Dispute resolved: prepayment refunded to the client" };
  for (const u of [b.clientId, vendorOwner]) if (u) notify(u, resolution === "release" ? "escrow_released" : "escrow_refunded", text, href);
}

/** DEMO: payout of the available balance to the vendor's card/account */
export function requestPayout(actor: Actor, vendorId: string, amount: number) {
  const db = getDB();
  const v = db.vendors.find((x) => x.id === vendorId);
  assert(!!v && can.editVendor(actor, v), "payout");
  const bal = escrow.vendorBalance(vendorId, db.bookings, db.transactions);
  const sum = Math.min(Math.floor(amount), bal.available);
  if (sum <= 0) throw new escrow.EscrowError("state");
  update((d) => ({ ...d, transactions: [...d.transactions, ...ledger([{ kind: "payout", amount: sum, vendorId }])] }));
  return sum;
}

// ── Notifications ─────────────────────────────────────────────

export function notify(userId: string, kind: NotificationKind, text: LText, href?: string) {
  const n: AppNotification = { id: uid("n"), userId, kind, text, href, read: false, createdAt: now() };
  update((d) => ({ ...d, notifications: [n, ...d.notifications].slice(0, 300) }));
}

export function markNotificationsRead(actor: Actor, ids?: string[]) {
  update((d) => ({
    ...d,
    notifications: d.notifications.map((n) => (n.userId === actor.id && (!ids || ids.includes(n.id)) ? { ...n, read: true } : n)),
  }));
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
    prepayPercent: getDB().settings?.defaultPrepayPercent ?? demoConfig.defaultPrepayPercent,
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

type InvitationInput = Omit<Invitation, "id" | "ownerId" | "rsvps" | "guests" | "views" | "createdAt" | "updatedAt">;

export function createInvitation(actor: Actor, input: InvitationInput): Invitation {
  assert(can.manageInvitation(actor, actor.id), "manageInvitation");
  const inv: Invitation = { ...input, id: uid("inv"), ownerId: actor.id, rsvps: [], guests: [], views: [], createdAt: now(), updatedAt: now() };
  update((d) => ({ ...d, invitations: [...d.invitations, inv] }));
  return inv;
}

export function updateInvitation(actor: Actor, id: string, patch: Partial<InvitationInput>) {
  const inv = getDB().invitations.find((x) => x.id === id);
  if (!inv) return;
  assert(can.manageInvitation(actor, inv.ownerId), "manageInvitation");
  update((d) => ({
    ...d,
    invitations: d.invitations.map((x) => (x.id === id ? { ...x, ...patch, id: x.id, ownerId: x.ownerId, rsvps: x.rsvps, guests: x.guests, views: x.views, updatedAt: now() } : x)),
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
    design: structuredClone(inv.design),
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
  const inv = getDB().invitations.find((x) => x.id === invitationId);
  const guestId = inv?.guests.some((g) => g.id === input.guestId) ? input.guestId : undefined;
  const rsvp: InvitationRsvp = {
    id: uid("r"),
    guestId,
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
        ? {
            ...x,
            rsvps: [
              ...x.rsvps.filter((r) => (guestId ? r.guestId !== guestId : r.guestId || r.name.toLowerCase() !== name.toLowerCase())),
              rsvp,
            ],
          }
        : x,
    ),
  }));
  if (inv) {
    notify(
      inv.ownerId,
      "rsvp",
      rsvp.attending
        ? { ru: `${name} придёт${rsvp.guests > 1 ? ` (+${rsvp.guests - 1})` : ""}`, en: `${name} is coming${rsvp.guests > 1 ? ` (+${rsvp.guests - 1})` : ""}` }
        : { ru: `${name} не сможет прийти`, en: `${name} can't come` },
      `/invitations/${inv.id}?tab=stats`,
    );
  }
  return rsvp;
}

/** Public: a guest opened the page (personal link → marks the guest as opened) */
export function recordInvitationView(invitationId: string, guestId?: string) {
  const ts = now();
  update((d) => ({
    ...d,
    invitations: d.invitations.map((x) =>
      x.id === invitationId
        ? {
            ...x,
            views: [...x.views, { at: ts, guestId: x.guests.some((g) => g.id === guestId) ? guestId : undefined }].slice(-2000),
            guests: x.guests.map((g) => (g.id === guestId && !g.openedAt ? { ...g, openedAt: ts } : g)),
          }
        : x,
    ),
  }));
}

function editGuests(actor: Actor, invitationId: string, fn: (g: InvitationGuest[]) => InvitationGuest[]) {
  const inv = getDB().invitations.find((x) => x.id === invitationId);
  if (!inv) return;
  assert(can.manageInvitation(actor, inv.ownerId), "manageInvitation");
  update((d) => ({ ...d, invitations: d.invitations.map((x) => (x.id === invitationId ? { ...x, guests: fn(x.guests) } : x)) }));
}

export function addGuests(actor: Actor, invitationId: string, list: Omit<InvitationGuest, "id">[]) {
  const clean = list
    .map((g) => ({ ...g, name: g.name.trim().slice(0, 80), phone: g.phone?.trim().slice(0, 32) || undefined, group: g.group?.trim().slice(0, 40) || undefined, seats: Math.min(10, Math.max(1, Math.floor(g.seats || 1))) }))
    .filter((g) => g.name);
  editGuests(actor, invitationId, (gs) => [...gs, ...clean.map((g) => ({ ...g, id: uid("g") }))]);
  return clean.length;
}

export function updateGuest(actor: Actor, invitationId: string, guestId: string, patch: Partial<Omit<InvitationGuest, "id">>) {
  editGuests(actor, invitationId, (gs) => gs.map((g) => (g.id === guestId ? { ...g, ...patch } : g)));
}

export function removeGuest(actor: Actor, invitationId: string, guestId: string) {
  editGuests(actor, invitationId, (gs) => gs.filter((g) => g.id !== guestId));
}

export function markGuestsSent(actor: Actor, invitationId: string, guestIds: string[]) {
  const ts = now();
  editGuests(actor, invitationId, (gs) => gs.map((g) => (guestIds.includes(g.id) ? { ...g, sentAt: g.sentAt ?? ts } : g)));
}

// ── Feed: posts, likes, saves, follows ────────────────────────

function toggleIn<T extends { userId: string }>(list: T[], match: (x: T) => boolean, item: T): T[] {
  return list.some(match) ? list.filter((x) => !match(x)) : [...list, item];
}

export function toggleLike(actor: Actor, postId: string) {
  update((d) => ({ ...d, likes: toggleIn(d.likes, (l) => l.userId === actor.id && l.postId === postId, { userId: actor.id, postId }) }));
}

export function toggleSave(actor: Actor, postId: string) {
  update((d) => ({ ...d, saved: toggleIn(d.saved, (l) => l.userId === actor.id && l.postId === postId, { userId: actor.id, postId }) }));
}

export function createPost(actor: Actor, input: { vendorId: string; photos: string[]; caption: string; offerId?: string; ratio?: number }): Post {
  const db = getDB();
  const v = db.vendors.find((x) => x.id === input.vendorId);
  assert(!!v && can.editVendor(actor, v), "createPost");
  const caption = input.caption.trim().slice(0, 600);
  const post: Post = {
    id: uid("p"),
    vendorId: v.id,
    photos: input.photos.slice(0, 10),
    caption: { ru: caption, en: caption },
    category: v.category,
    offerId: input.offerId,
    baseLikes: 0,
    ratio: input.ratio ?? 1.25,
    createdAt: now(),
  };
  update((d) => ({ ...d, posts: [post, ...d.posts] }));
  return post;
}

export function deletePost(actor: Actor, postId: string) {
  const db = getDB();
  const p = db.posts.find((x) => x.id === postId);
  const v = p && db.vendors.find((x) => x.id === p.vendorId);
  if (!p || !v) return;
  assert(can.editVendor(actor, v), "deletePost");
  update((d) => ({
    ...d,
    posts: d.posts.filter((x) => x.id !== postId),
    likes: d.likes.filter((l) => l.postId !== postId),
    saved: d.saved.filter((l) => l.postId !== postId),
    comments: d.comments.filter((c) => c.postId !== postId),
  }));
}

/** Only a client with a finished deal with this vendor can comment (see can.commentPost) */
export function addComment(actor: Actor, postId: string, text: string): PostComment | undefined {
  const db = getDB();
  const p = db.posts.find((x) => x.id === postId);
  const clean = text.trim().replace(/\s+/g, " ").slice(0, 500);
  if (!p || !clean) return;
  assert(can.commentPost(actor, db, p.vendorId), "commentPost");
  const author = db.users.find((u) => u.id === actor.id)?.name || "Клиент";
  const comment: PostComment = { id: uid("pc"), postId, userId: actor.id, author, text: clean, createdAt: now() };
  update((d) => ({ ...d, comments: [...d.comments, comment] }));
  const v = db.vendors.find((x) => x.id === p.vendorId);
  if (v) notify(v.ownerId, "review", { ru: `${author} оставил комментарий`, en: `${author} left a comment` }, `/vendors?post=${postId}`);
  return comment;
}

/** The author removes their own comment; admin moderates */
export function deleteComment(actor: Actor, commentId: string) {
  const c = getDB().comments.find((x) => x.id === commentId);
  if (!c) return;
  assert(actor.role === "admin" || c.userId === actor.id, "deleteComment");
  update((d) => ({ ...d, comments: d.comments.filter((x) => x.id !== commentId) }));
}

export function setPostHidden(actor: Actor, postId: string, hidden: boolean) {
  assert(actor.role === "admin", "moderatePost");
  update((d) => ({ ...d, posts: d.posts.map((p) => (p.id === postId ? { ...p, hidden } : p)) }));
}

// ── Reviews ───────────────────────────────────────────────────

/** Client leaves a review once the booking is completed (one per booking) */
export function leaveReview(actor: Actor, bookingId: string, rating: number, text: string) {
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
  if (v) notify(v.ownerId, "review", { ru: `Новый отзыв: ${r} из 5`, en: `New review: ${r} of 5` }, "/vendor/reviews");
}

export function replyToReview(actor: Actor, reviewId: string, text: string) {
  const db = getDB();
  const r = db.reviews.find((x) => x.id === reviewId);
  const v = r && db.vendors.find((x) => x.id === r.vendorId);
  assert(!!v && can.editVendor(actor, v), "replyReview");
  const clean = text.trim().slice(0, 1000);
  update((d) => ({ ...d, reviews: d.reviews.map((x) => (x.id === reviewId ? { ...x, reply: clean ? { text: clean, date: now().slice(0, 10) } : undefined } : x)) }));
}

export function setReviewHidden(actor: Actor, reviewId: string, hidden: boolean) {
  assert(actor.role === "admin", "moderateReview");
  update((d) => ({ ...d, reviews: d.reviews.map((x) => (x.id === reviewId ? { ...x, hidden } : x)) }));
}

// ── Platform settings & users (admin) ─────────────────────────

export function updateSettings(actor: Actor, patch: Partial<PlatformSettings>) {
  assert(actor.role === "admin", "settings");
  const clamp = (n: number | undefined, max: number) => (n === undefined ? undefined : Math.min(max, Math.max(0, Math.round(n))));
  update((d) => ({
    ...d,
    settings: {
      ...d.settings,
      ...(patch.feePercent !== undefined && { feePercent: clamp(patch.feePercent, 30)! }),
      ...(patch.defaultPrepayPercent !== undefined && { defaultPrepayPercent: clamp(patch.defaultPrepayPercent, 100)! }),
      ...(patch.autoReleaseDays !== undefined && { autoReleaseDays: clamp(patch.autoReleaseDays, 60)! }),
    },
  }));
}

export function setUserBlocked(actor: Actor, userId: string, blocked: boolean) {
  assert(actor.role === "admin" && userId !== actor.id, "blockUser");
  update((d) => ({ ...d, users: d.users.map((u) => (u.id === userId ? { ...u, blocked } : u)) }));
}

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
export function upsertAuthUser(input: { email: string; name?: string; provider: "google" | "email" }) {
  const email = input.email.trim().toLowerCase();
  const existing = getDB().users.find((u) => u.email?.toLowerCase() === email);
  if (existing) return existing;
  const user = {
    id: uid("u"),
    role: "client" as const,
    name: (input.name ?? "").trim().slice(0, 80),
    email,
    authProvider: input.provider,
    needsOnboarding: true,
  };
  update((d) => ({ ...d, users: [...d.users, user] }));
  return user;
}

export function updateProfile(actor: Actor, patch: { name?: string; city?: string; phone?: string }) {
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
export function completeClientOnboarding(
  actor: Actor,
  input: {
    name: string;
    city: string;
    event: { title: string; date: string; guests: number; budget: number };
    priorities: CategoryId[];
  },
): EventItem {
  const client: Actor = { id: actor.id, role: "client" };
  updateProfile(client, { name: input.name, city: input.city });
  const e = createEvent(client, { ...input.event, city: input.city });
  const order: CategoryId[] = [...input.priorities, ...e.checklist.flatMap((c) => (c.category ? [c.category] : []))];
  const seen = new Set<CategoryId>();
  const checklist: ChecklistItem[] = order
    .filter((c) => !seen.has(c) && seen.add(c))
    .map((c, i) => ({ id: `c${i}`, title: CHECKLIST_TITLES[c], done: false, category: c }));
  setChecklist(client, e.id, checklist);
  finishOnboarding(actor.id, "client");
  return { ...e, checklist };
}

/**
 * The whole vendor sign-up in ONE store update: profile, vendor with details and
 * photos, first service and first post, onboarding done. A single write leaves
 * nothing half-saved (another tab, a failed storage write, a closed tab) and also
 * finishes an earlier interrupted attempt by reusing the vendor it created.
 */
export function signUpVendor(
  actor: Actor,
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
): { vendor: Vendor; offerId: string; postId: string } {
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
    hidden: false,
    prepayPercent: db.settings?.defaultPrepayPercent ?? demoConfig.defaultPrepayPercent,
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

/** Vendor branch: the signed-up user becomes the owner of a new (unverified) vendor profile */
export function registerOwnVendor(
  actor: Actor,
  input: { ownerName: string; name: string; category: CategoryId; city: string; phone?: string; tagline: string },
): Vendor {
  assert(can.registerOwnVendor(actor, getDB()), "registerOwnVendor");
  updateProfile(actor, { name: input.ownerName, city: input.city, phone: input.phone });
  const slugBase =
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, "-")
      .replace(/^-|-$/g, "") || "vendor";
  const tagline = input.tagline.trim().slice(0, 160);
  const vendor: Vendor = {
    id: uid("v"),
    ownerId: actor.id,
    slug: `${slugBase}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim().slice(0, 80),
    category: input.category,
    city: input.city,
    tagline: { ru: tagline, en: tagline },
    description: { ru: "", en: "" },
    rating: 0,
    reviewsCount: 0,
    verified: false,
    hidden: false,
    prepayPercent: getDB().settings?.defaultPrepayPercent ?? demoConfig.defaultPrepayPercent,
    cover: unsplash(PHOTOS[CATEGORY_PHOTOS[input.category]][0], 1600, 900),
    portfolio: PHOTOS[CATEGORY_PHOTOS[input.category]].slice(0, 6).map((id) => unsplash(id, 1200)),
    phone: input.phone?.trim() ?? "",
    yearsOnMarket: 0,
    responseMinutes: 30,
    createdAt: now(),
    specs: {},
    ordersBase: 0,
  };
  update((d) => ({ ...d, vendors: [...d.vendors, vendor], stats: [...d.stats, { vendorId: vendor.id, views: 0 }] }));
  finishOnboarding(actor.id, "vendor");
  return vendor;
}
