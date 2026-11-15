"use client";

/** Platform settings and user blocking (admin). */
import { assert, DOC_KINDS } from "../policies";
import type { PlatformSettings } from "../types";
import { currentActor, update } from "./_core";

// ── Platform settings & users (admin) ─────────────────────────

export function updateSettings(patch: Partial<PlatformSettings>) {
  const actor = currentActor();
  assert(actor.role === "admin", "settings");
  const clamp = (n: number | undefined, max: number) => (n === undefined ? undefined : Math.min(max, Math.max(0, Math.round(n))));
  update((d) => ({
    ...d,
    settings: {
      ...d.settings,
      ...(patch.feePercent !== undefined && { feePercent: clamp(patch.feePercent, 30)! }),
      ...(patch.defaultPrepayPercent !== undefined && { defaultPrepayPercent: clamp(patch.defaultPrepayPercent, 100)! }),
      ...(patch.autoReleaseDays !== undefined && { autoReleaseDays: clamp(patch.autoReleaseDays, 60)! }),
      ...(patch.autoHideComplaints !== undefined && { autoHideComplaints: clamp(patch.autoHideComplaints, 20)! }),
      ...(patch.lowRatingThreshold !== undefined && { lowRatingThreshold: Math.min(4, Math.max(1, Math.round(patch.lowRatingThreshold))) }),
      ...(patch.requiredDocs && { requiredDocs: patch.requiredDocs.filter((k, i, a) => DOC_KINDS.includes(k) && a.indexOf(k) === i) }),
      ...(patch.notifyOnComplaint !== undefined && { notifyOnComplaint: !!patch.notifyOnComplaint }),
      ...(patch.hideUnverified !== undefined && { hideUnverified: !!patch.hideUnverified }),
      ...(patch.supportPhone !== undefined && { supportPhone: patch.supportPhone.trim().slice(0, 40) }),
      ...(patch.supportEmail !== undefined && { supportEmail: patch.supportEmail.trim().slice(0, 80) }),
    },
  }));
}

export function setUserBlocked(userId: string, blocked: boolean) {
  const actor = currentActor();
  assert(actor.role === "admin" && userId !== actor.id, "blockUser");
  update((d) => ({ ...d, users: d.users.map((u) => (u.id === userId ? { ...u, blocked } : u)) }));
}
