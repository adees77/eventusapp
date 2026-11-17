"use client";

/** Chats and notifications. Supabase: conversations/messages under participant RLS + realtime. */
import { addDays, format } from "date-fns";
import type { VendorChatRequest } from "@/lib/ai/vendor-protocol";
import { getAvailability } from "../availability";
import { ordersDone } from "../feed";
import type { Actor } from "../policies";
import { assistantActive, can } from "../policies";
import { conversationsFor, isUnread, lastMessage, unreadCount } from "../queries";
import { CATEGORIES, CITIES } from "../seed/catalog";
import { specFacts } from "../specs";
import { getDB, useDB } from "../store";
import type { Conversation, DB } from "../types";
import { nameOf, vendorNameOf } from "./_shared";

/** The name shown for the other side of a chat */
const counterpart = (db: DB, actor: Actor, c: Pick<Conversation, "clientId" | "vendorId">) =>
  actor.role === "vendor" ? nameOf(db, c.clientId) : vendorNameOf(db, c.vendorId);

export function selectInbox(db: DB, actor: Actor) {
  return conversationsFor(db, actor).map((c) => ({
    conversation: c,
    name: counterpart(db, actor, c),
    last: lastMessage(db, c.id),
    unread: isUnread(db, c, actor.id),
  }));
}
export const useInbox = (actor: Actor) => useDB((db) => selectInbox(db, actor));
export const useUnreadCount = (actor: Actor) => useDB((db) => unreadCount(db, actor));

/** One chat with its deal; `conversation` is undefined when it does not exist or is not the actor's */
export function selectThread(db: DB, actor: Actor, id: string) {
  const found = db.conversations.find((c) => c.id === id);
  const conversation = found && can.viewConversation(actor, db, found) ? found : undefined;
  if (!conversation) return { conversation: undefined, messages: [], suggested: {}, assistant: false, name: "", canSend: false };
  const booking = conversation.bookingId ? db.bookings.find((b) => b.id === conversation.bookingId) : undefined;
  const messages = db.messages.filter((m) => m.conversationId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const suggestedIds = new Set(messages.flatMap((m) => m.offerIds ?? []));
  return {
    conversation,
    messages,
    /** services the AI assistant suggested in this chat, by id */
    suggested: Object.fromEntries(db.offers.filter((o) => suggestedIds.has(o.id)).map((o) => [o.id, o])),
    /** the vendor's AI assistant answers here right now */
    assistant: assistantActive(db, conversation),
    booking,
    offer: booking ? db.offers.find((o) => o.id === booking.offerId) : undefined,
    vendor: db.vendors.find((v) => v.id === conversation.vendorId),
    name: counterpart(db, actor, conversation),
    /** admins may read a chat but not write into it */
    canSend: can.sendMessage(actor, db, conversation),
  };
}
export const useThread = (actor: Actor, id: string) => useDB((db) => selectThread(db, actor, id));

export const useMyNotifications = (userId: string, limit = 12) =>
  useDB((db) => db.notifications.filter((n) => n.userId === userId).slice(0, limit));

/** How far ahead the assistant knows busy dates */
const BUSY_HORIZON_DAYS = 120;

/**
 * Everything the vendor's AI assistant needs to answer the last client message
 * in this chat, or null when it should stay quiet (turned off, the vendor is
 * writing themselves, or the actor is not this chat's client).
 * Supabase: built on the server from the database (prices never reach the browser).
 */
export function selectAssistantRequest(db: DB, actor: Actor, conversationId: string, locale: "ru" | "en", now = new Date()) {
  const c = db.conversations.find((x) => x.id === conversationId);
  if (!c || !can.assistantReply(actor, db, c) || !assistantActive(db, c, now.getTime())) return null;
  const v = db.vendors.find((x) => x.id === c.vendorId);
  if (!v) return null;
  const pick = (x: { ru: string; en: string } | undefined) => (x ? x[locale] || x.ru : "");
  const days = Array.from({ length: BUSY_HORIZON_DAYS }, (_, i) => format(addDays(now, i), "yyyy-MM-dd"));
  const offers = db.offers.filter((o) => o.vendorId === v.id && o.active);
  const history = db.messages
    .filter((m) => m.conversationId === c.id && !m.system && m.text.trim())
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-30)
    .map((m) => ({ from: m.senderId === c.clientId ? ("client" as const) : ("vendor" as const), text: m.text.slice(0, 4000) }));
  if (!history.length || history[history.length - 1].from !== "client") return null;
  const today = format(now, "yyyy-MM-dd");
  const event = db.events.filter((e) => e.clientId === c.clientId && e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  const req: VendorChatRequest = {
    locale,
    today,
    clientName: db.users.find((u) => u.id === c.clientId)?.name.split(" ")[0],
    event: event ? { title: event.title.slice(0, 120), date: event.date, guests: event.guests || undefined } : undefined,
    vendor: {
      name: v.name,
      category: pick(CATEGORIES.find((x) => x.id === v.category)?.name),
      city: pick(CITIES[v.city]),
      tagline: pick(v.tagline).slice(0, 600),
      description: pick(v.description).slice(0, 2000),
      rating: v.rating,
      reviewsCount: v.reviewsCount,
      ordersDone: ordersDone(db, v),
      prepayPercent: v.prepayPercent,
      responseMinutes: v.responseMinutes,
      verified: v.verified,
      facts: specFacts(v.category, v.specs, 20).map((f) => pick(f).slice(0, 600)),
      offers: offers.slice(0, 20).map((o) => ({
        id: o.id,
        title: pick(o.title).slice(0, 600),
        description: pick(o.description).slice(0, 1200),
        price: o.price,
        unit: pick(o.unit).slice(0, 60),
        totalUnits: o.totalUnits,
        capacity: o.capacity,
        busyDates: days.filter((d) => getAvailability(db, o, d).free === 0),
      })),
      reviews: db.reviews
        .filter((r) => r.vendorId === v.id && !r.hidden)
        .slice(0, 6)
        .map((r) => ({ rating: r.rating, text: pick(r.text).slice(0, 600) })),
    },
    history,
  };
  return req;
}
/** Read once at send time (not a subscription) */
export const readAssistantRequest = (actor: Actor, conversationId: string, locale: "ru" | "en") =>
  selectAssistantRequest(getDB(), actor, conversationId, locale);
