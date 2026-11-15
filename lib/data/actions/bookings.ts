"use client";

/** Bookings and the P2P escrow deal flow (hold → confirm → release / refund / dispute, payouts). */
import { getAvailability } from "../availability";
import { assert, can, type Actor } from "../policies";
import { getDB } from "../store";
import type { Booking, CategoryId, EventItem, Transaction } from "../types";
import * as escrow from "@/lib/payments/escrow";
import { currentActor, now, uid, update } from "./_core";
import { addSystemMessage, ensureConversation } from "./messaging";
import { notify } from "./notifications";
import { routes } from "@/lib/routes";

// ── Bookings ──────────────────────────────────────────────────

export class AvailabilityError extends Error {
  constructor(public free: number) {
    super("Not enough units available");
  }
}

export function createBooking(
  input: { offerId: string; date: string; qty: number; eventId?: string; note?: string },
): Booking {
  const actor = currentActor();
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
export function markBookingPrepaid(bookingId: string, paymentRef: string): string {
  const actor = currentActor();
  const db = getDB();
  const b = db.bookings.find((x) => x.id === bookingId);
  if (!b) throw new Error("Booking not found");
  assert(can.payBooking(actor, b), "payBooking");

  // Re-check: the pending booking already holds units, so validate excluding itself
  const offer = db.offers.find((o) => o.id === b.offerId)!;
  const others = { blocks: db.blocks, bookings: db.bookings.filter((x) => x.id !== b.id) };
  const { free } = getAvailability(others, offer, b.date);
  if (free < b.qty) throw new AvailabilityError(free);

  const conversationId = ensureConversation(b.vendorId, b.id);
  const t = escrow.hold(b, now());
  update((d) => ({
    ...d,
    bookings: d.bookings.map((x) => (x.id === b.id ? { ...x, status: t.status, escrow: t.escrow, paymentRef } : x)),
    transactions: [...d.transactions, ...ledger(t.ledger)],
    events: d.events.map((e) => (e.id === b.eventId ? checkCategory(e, d.vendors.find((v) => v.id === b.vendorId)?.category) : e)),
  }));
  addSystemMessage(conversationId, "escrow_held");
  const vendor = db.vendors.find((v) => v.id === b.vendorId);
  if (vendor) notify(vendor.ownerId, "booking_new", { ru: "Новая бронь: предоплата заморожена до подтверждения сделки", en: "New booking: prepayment is frozen until the deal is confirmed" }, routes.chat(conversationId));
  return conversationId;
}

function checkCategory(e: EventItem, category?: CategoryId): EventItem {
  if (!category) return e;
  return { ...e, checklist: e.checklist.map((c) => (c.category === category ? { ...c, done: true } : c)) };
}

export function setBookingStatus(bookingId: string, status: Booking["status"]) {
  const actor = currentActor();
  const db = getDB();
  const b = db.bookings.find((x) => x.id === bookingId);
  if (!b) throw new Error("Booking not found");
  assert(can.setBookingStatus(actor, db, b, status), "setBookingStatus");
  // cancelling a booking with frozen money always refunds the client
  if (status === "cancelled" && b.escrow?.state === "held") return cancelDeal(bookingId);
  update((d) => ({ ...d, bookings: d.bookings.map((x) => (x.id === bookingId ? { ...x, status } : x)) }));
  const conv = db.conversations.find((c) => c.bookingId === bookingId);
  if (conv && (status === "confirmed" || status === "cancelled" || status === "completed")) {
    addSystemMessage(conv.id, `booking_${status}`);
  }
  notify(b.clientId, "booking_status", { ru: "Статус брони обновлён", en: "Booking status updated" }, conv ? routes.chat(conv.id) : routes.bookings);
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
  return { vendorOwner: v?.ownerId, href: conv ? routes.chat(conv.id) : undefined, convId: conv?.id };
}

/** «Подтвердить сделку». Releases the money when both sides have confirmed. */
export function confirmDeal(bookingId: string) {
  const actor = currentActor();
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

export function unconfirmDeal(bookingId: string) {
  const actor = currentActor();
  const b = getDB().bookings.find((x) => x.id === bookingId);
  if (!b) throw new Error("Booking not found");
  applyTransition(b.id, escrow.unconfirm(b, partyOf(actor, b)));
}

/** Cancel before both confirmed → full refund of the frozen prepayment */
export function cancelDeal(bookingId: string) {
  const actor = currentActor();
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

export function openDispute(bookingId: string, reason: string) {
  const actor = currentActor();
  const b = getDB().bookings.find((x) => x.id === bookingId);
  if (!b) throw new Error("Booking not found");
  partyOf(actor, b);
  applyTransition(b.id, escrow.openDispute(b, actor.id, reason, now()));
  const { vendorOwner, href, convId } = dealParties(b);
  if (convId) addSystemMessage(convId, "escrow_disputed");
  const text = { ru: "Открыт спор по сделке — деньги заморожены до решения EVENTUS", en: "A dispute was opened — money stays frozen until EVENTUS decides" };
  for (const u of [b.clientId, vendorOwner, ...getDB().users.filter((x) => x.role === "admin").map((x) => x.id)]) {
    if (u) notify(u, "escrow_disputed", text, u.startsWith("u-admin") ? routes.adminDisputes : href);
  }
}

export function resolveDispute(bookingId: string, resolution: "release" | "refund") {
  const actor = currentActor();
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
export function requestPayout(vendorId: string, amount: number) {
  const actor = currentActor();
  const db = getDB();
  const v = db.vendors.find((x) => x.id === vendorId);
  assert(!!v && can.editVendor(actor, v), "payout");
  const bal = escrow.vendorBalance(vendorId, db.bookings, db.transactions);
  const sum = Math.min(Math.floor(amount), bal.available);
  if (sum <= 0) throw new escrow.EscrowError("state");
  update((d) => ({ ...d, transactions: [...d.transactions, ...ledger([{ kind: "payout", amount: sum, vendorId }])] }));
  return sum;
}
