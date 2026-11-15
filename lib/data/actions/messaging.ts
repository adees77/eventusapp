"use client";

/** Client ↔ vendor conversations and messages. */
import { demoFeature } from "@/lib/demo/mode";
import { assert, can } from "../policies";
import { getDB } from "../store";
import type { Message } from "../types";
import { currentActor, now, uid, update } from "./_core";

// ── Messaging ─────────────────────────────────────────────────

/** Find or create the conversation between a client and a vendor (optionally for a booking). */
export function ensureConversation(vendorId: string, bookingId?: string): string {
  const actor = currentActor();
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

export function sendMessage(conversationId: string, text: string) {
  const actor = currentActor();
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
  if (!demoFeature("vendorAutoReply")) return;
  const db = getDB();
  const c = db.conversations.find((x) => x.id === conversationId);
  const v = c && db.vendors.find((x) => x.id === c.vendorId);
  if (!c || !v) return;
  pushMessage({ id: uid("m"), conversationId, senderId: v.ownerId, text, createdAt: now() });
}

export function markRead(conversationId: string) {
  const actorId = currentActor().id;
  const ts = now();
  update((d) => ({
    ...d,
    conversations: d.conversations.map((c) =>
      c.id === conversationId ? { ...c, readAt: { ...c.readAt, [actorId]: ts } } : c,
    ),
  }));
}
