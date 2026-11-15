"use client";

/** In-app notifications. `notify` writes for another user — on Supabase this becomes a DB trigger. */
import type {  } from "../policies";
import type { AppNotification, LText, NotificationKind } from "../types";
import { currentActor, now, uid, update } from "./_core";

// ── Notifications ─────────────────────────────────────────────

export function notify(userId: string, kind: NotificationKind, text: LText, href?: string) {
  const n: AppNotification = { id: uid("n"), userId, kind, text, href, read: false, createdAt: now() };
  update((d) => ({ ...d, notifications: [n, ...d.notifications].slice(0, 300) }));
}

export function markNotificationsRead(ids?: string[]) {
  const actor = currentActor();
  update((d) => ({
    ...d,
    notifications: d.notifications.map((n) => (n.userId === actor.id && (!ids || ids.includes(n.id)) ? { ...n, read: true } : n)),
  }));
}
