"use client";

/** Client events and their checklists. */
import { assert, can } from "../policies";
import { getDB } from "../store";
import type { CategoryId, ChecklistItem, EventItem } from "../types";
import { currentActor, now, uid, update } from "./_core";

// ── Client events ─────────────────────────────────────────────

export function createEvent(input: Omit<EventItem, "id" | "clientId" | "createdAt" | "checklist">) {
  const actor = currentActor();
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

export function updateEvent(eventId: string, patch: Partial<EventItem>) {
  const actor = currentActor();
  const e = getDB().events.find((x) => x.id === eventId);
  if (!e) return;
  assert(can.manageEvent(actor, e.clientId), "manageEvent");
  update((d) => ({ ...d, events: d.events.map((x) => (x.id === eventId ? { ...x, ...patch, id: x.id, clientId: x.clientId } : x)) }));
}

export function setChecklist(eventId: string, checklist: ChecklistItem[]) {
  updateEvent(eventId, { checklist });
}
