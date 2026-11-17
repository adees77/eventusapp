"use client";

/** Invitation designs, guests, RSVPs and views. */
import { assert, can, type Actor } from "../policies";
import { getDB } from "../store";
import type { Invitation, InvitationGuest, InvitationRsvp } from "../types";
import { currentActor, now, uid, update } from "./_core";
import { notify } from "./notifications";
import { routes } from "@/lib/routes";

// ── Invitations ───────────────────────────────────────────────

type InvitationInput = Omit<Invitation, "id" | "ownerId" | "rsvps" | "guests" | "views" | "createdAt" | "updatedAt">;

export async function createInvitation(input: InvitationInput): Promise<Invitation> {
  const actor = currentActor();
  assert(can.manageInvitation(actor, actor.id), "manageInvitation");
  const inv: Invitation = { ...input, id: uid("inv"), ownerId: actor.id, rsvps: [], guests: [], views: [], createdAt: now(), updatedAt: now() };
  update((d) => ({ ...d, invitations: [...d.invitations, inv] }));
  return inv;
}

export async function updateInvitation(id: string, patch: Partial<InvitationInput>) {
  const actor = currentActor();
  const inv = getDB().invitations.find((x) => x.id === id);
  if (!inv) return;
  assert(can.manageInvitation(actor, inv.ownerId), "manageInvitation");
  update((d) => ({
    ...d,
    invitations: d.invitations.map((x) => (x.id === id ? { ...x, ...patch, id: x.id, ownerId: x.ownerId, rsvps: x.rsvps, guests: x.guests, views: x.views, updatedAt: now() } : x)),
  }));
}

export async function duplicateInvitation(id: string): Promise<Invitation | undefined> {
  const actor = currentActor();
  const inv = getDB().invitations.find((x) => x.id === id);
  if (!inv) return;
  assert(can.manageInvitation(actor, inv.ownerId), "manageInvitation");
  return createInvitation({
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

export async function deleteInvitation(id: string) {
  const actor = currentActor();
  const inv = getDB().invitations.find((x) => x.id === id);
  if (!inv) return;
  assert(can.manageInvitation(actor, inv.ownerId), "manageInvitation");
  update((d) => ({ ...d, invitations: d.invitations.filter((x) => x.id !== id) }));
}

/** Public: anyone with the link can answer. One answer per name (latest wins). */
export async function submitRsvp(invitationId: string, input: Omit<InvitationRsvp, "id" | "createdAt">) {
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
      routes.invitation(inv.id, "stats"),
    );
  }
  return rsvp;
}

/** Public: a guest opened the page (personal link → marks the guest as opened) */
export async function recordInvitationView(invitationId: string, guestId?: string) {
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

export async function addGuests(invitationId: string, list: Omit<InvitationGuest, "id">[]) {
  const actor = currentActor();
  const clean = list
    .map((g) => ({ ...g, name: g.name.trim().slice(0, 80), phone: g.phone?.trim().slice(0, 32) || undefined, group: g.group?.trim().slice(0, 40) || undefined, seats: Math.min(10, Math.max(1, Math.floor(g.seats || 1))) }))
    .filter((g) => g.name);
  editGuests(actor, invitationId, (gs) => [...gs, ...clean.map((g) => ({ ...g, id: uid("g") }))]);
  return clean.length;
}

export async function updateGuest(invitationId: string, guestId: string, patch: Partial<Omit<InvitationGuest, "id">>) {
  const actor = currentActor();
  editGuests(actor, invitationId, (gs) => gs.map((g) => (g.id === guestId ? { ...g, ...patch } : g)));
}

export async function removeGuest(invitationId: string, guestId: string) {
  const actor = currentActor();
  editGuests(actor, invitationId, (gs) => gs.filter((g) => g.id !== guestId));
}

export async function markGuestsSent(invitationId: string, guestIds: string[]) {
  const actor = currentActor();
  const ts = now();
  editGuests(actor, invitationId, (gs) => gs.map((g) => (guestIds.includes(g.id) ? { ...g, sentAt: g.sentAt ?? ts } : g)));
}
