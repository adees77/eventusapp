"use client";

/** The client cabinet (/dashboard/*, /invitations). Supabase: rows where client_id = auth.uid(). */
import { invitationStats } from "@/lib/invitations/design";
import { clientMoney, escrowOf } from "@/lib/payments/escrow";
import type { Actor } from "../policies";
import { feedItem, searchPosts } from "../feed";
import { activeOffers, minPrice, type VendorResult } from "../queries";
import { useDB } from "../store";
import type { DB } from "../types";
import { bookingView } from "./_shared";
import { selectClientBookings } from "./bookings";

const today = () => new Date().toISOString().slice(0, 10);

export const selectClientEvents = (db: DB, clientId: string) =>
  db.events.filter((e) => e.clientId === clientId).sort((a, b) => a.date.localeCompare(b.date));
export const useClientEvents = (clientId: string) => useDB((db) => selectClientEvents(db, clientId));
/** The nearest upcoming event of the client */
export const useNextEvent = (clientId: string) => useDB((db) => selectClientEvents(db, clientId).find((e) => e.date >= today()));

export function selectClientOverview(db: DB, actor: Actor) {
  const events = selectClientEvents(db, actor.id);
  const event = events.find((e) => e.date >= today()) ?? events[0];
  const bookings = selectClientBookings(db, actor.id);
  const active = bookings.filter((r) => r.booking.status !== "cancelled");
  const invitation = db.invitations.find((i) => i.ownerId === actor.id && (!event || i.eventId === event.id));
  const missingCategory = event?.checklist.find((c) => !c.done && c.category)?.category;
  return {
    user: db.users.find((u) => u.id === actor.id),
    event,
    bookings,
    active,
    money: clientMoney(actor.id, db.bookings),
    booked: event ? active.filter((r) => r.booking.eventId === event.id).reduce((s, r) => s + r.booking.total, 0) : 0,
    invitation,
    invitationStats: invitation ? invitationStats(invitation) : null,
    missingCategory,
    missingCategoryName: db.categories.find((c) => c.id === missingCategory)?.name,
    ideas: missingCategory ? searchPosts(db, { category: missingCategory }, actor).slice(0, 8) : [],
  };
}
export const useClientOverview = (actor: Actor) => useDB((db) => selectClientOverview(db, actor));

/** Deals waiting for the client's payment or confirmation (nav badge) */
export const useClientTodoCount = (clientId: string) =>
  useDB(
    (db) =>
      db.bookings.filter(
        (b) => b.clientId === clientId && (b.status === "pending" || (escrowOf(b).state === "held" && !b.escrow?.clientConfirmedAt)),
      ).length,
  );

/** One event's bookings and budget, by category */
export function selectEventBudget(db: DB, clientId: string, eventId?: string) {
  const list = eventId ? db.bookings.filter((b) => b.clientId === clientId && b.eventId === eventId && b.status !== "cancelled") : [];
  const byCategory = db.categories
    .map((c) => {
      const inCat = list.filter((b) => db.vendors.find((v) => v.id === b.vendorId)?.category === c.id);
      return { c, total: inCat.reduce((s, b) => s + b.total, 0), count: inCat.length };
    })
    .filter((x) => x.count > 0)
    .sort((a, b) => b.total - a.total);
  return {
    booked: list.reduce((s, b) => s + b.total, 0),
    prepaid: list.filter((b) => b.status !== "pending").reduce((s, b) => s + b.prepayAmount, 0),
    byCategory,
  };
}
export const useEventBudget = (clientId: string, eventId?: string) => useDB((db) => selectEventBudget(db, clientId, eventId));

export function selectClientPayments(db: DB, clientId: string) {
  return {
    money: clientMoney(clientId, db.bookings),
    deals: db.bookings
      .filter((b) => b.clientId === clientId && b.escrow)
      .sort((a, b) => (b.escrow!.heldAt ?? "").localeCompare(a.escrow!.heldAt ?? ""))
      .map((b) => bookingView(db, b)),
    history: db.transactions
      .filter((x) => x.clientId === clientId && (x.kind === "hold" || x.kind === "refund"))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}
export const useClientPayments = (clientId: string) => useDB((db) => selectClientPayments(db, clientId));

/** A card-ready result for a vendor shown outside search (favorites, similar) */
export function vendorCard(db: DB, vendorId: string): VendorResult | null {
  const vendor = db.vendors.find((v) => v.id === vendorId);
  if (!vendor) return null;
  const offers = activeOffers(db, vendor.id);
  return { vendor, offers, minPrice: minPrice(offers), availability: null, bestOffer: null, bestOfferAvailability: null };
}

export function selectSaved(db: DB, actor: Actor) {
  return {
    posts: db.saved
      .filter((s) => s.userId === actor.id)
      .flatMap((s) => {
        const p = db.posts.find((x) => x.id === s.postId);
        const it = p && feedItem(db, p, actor);
        return it ? [it] : [];
      }),
    vendors: db.favorites
      .filter((f) => f.userId === actor.id)
      .flatMap((f) => {
        const r = vendorCard(db, f.vendorId);
        return r && !r.vendor.hidden ? [r] : [];
      }),
  };
}
export const useSaved = (actor: Actor) => useDB((db) => selectSaved(db, actor));

export const useMyInvitations = (ownerId: string) =>
  useDB((db) => db.invitations.filter((i) => i.ownerId === ownerId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
export const useInvitation = (id: string) => useDB((db) => db.invitations.find((i) => i.id === id));
