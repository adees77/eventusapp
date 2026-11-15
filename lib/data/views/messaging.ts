"use client";

/** Chats and notifications. Supabase: conversations/messages under participant RLS + realtime. */
import type { Actor } from "../policies";
import { can } from "../policies";
import { conversationsFor, isUnread, lastMessage, unreadCount } from "../queries";
import { useDB } from "../store";
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
  if (!conversation) return { conversation: undefined, messages: [], name: "", canSend: false };
  const booking = conversation.bookingId ? db.bookings.find((b) => b.id === conversation.bookingId) : undefined;
  return {
    conversation,
    messages: db.messages.filter((m) => m.conversationId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
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
