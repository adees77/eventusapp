"use client";

/** Vendor verification documents and complaints. */
import { assert, can, DOC_KINDS, missingDocs } from "../policies";
import { getDB } from "../store";
import type { Complaint, ComplaintReason, ComplaintTarget, DB, DocKind, VendorDocument } from "../types";
import { currentActor, now, uid, update } from "./_core";
import { notify } from "./notifications";
import { routes } from "@/lib/routes";

// ── Verification (documents) ──────────────────────────────────

const admins = () => getDB().users.filter((u) => u.role === "admin").map((u) => u.id);

/** The vendor attaches a document; re-uploading a kind replaces the previous file */
export async function uploadDocument(vendorId: string, kind: DocKind, fileName: string) {
  const actor = currentActor();
  const v = getDB().vendors.find((x) => x.id === vendorId);
  assert(can.manageDocuments(actor, v) && DOC_KINDS.includes(kind), "uploadDocument");
  const name = fileName.trim().slice(0, 120) || `${kind}.pdf`;
  const doc: VendorDocument = { id: uid("doc"), vendorId, kind, fileName: name, status: "pending", uploadedAt: now() };
  update((d) => ({ ...d, documents: [...d.documents.filter((x) => !(x.vendorId === vendorId && x.kind === kind)), doc] }));
}

export async function removeDocument(docId: string) {
  const actor = currentActor();
  const db = getDB();
  const doc = db.documents.find((x) => x.id === docId);
  assert(!!doc && can.manageDocuments(actor, db.vendors.find((v) => v.id === doc.vendorId)) && doc.status !== "approved", "removeDocument");
  update((d) => ({ ...d, documents: d.documents.filter((x) => x.id !== docId) }));
}

/** Kinds still missing (or rejected) before the vendor can ask for the badge */
export async function requestVerification(vendorId: string) {
  const actor = currentActor();
  const db = getDB();
  const v = db.vendors.find((x) => x.id === vendorId);
  assert(!!v && actor.role === "vendor" && v.ownerId === actor.id && !v.verified && missingDocs(db, vendorId).length === 0, "requestVerification");
  update((d) => ({ ...d, vendors: d.vendors.map((x) => (x.id === vendorId ? { ...x, verification: { state: "pending", requestedAt: now() } } : x)) }));
  for (const a of admins()) notify(a, "system", { ru: `${v.name} отправил документы на проверку`, en: `${v.name} sent documents for review` }, routes.adminVerification);
}

export async function reviewDocument(docId: string, status: "approved" | "rejected", note?: string) {
  const actor = currentActor();
  assert(can.reviewDocuments(actor), "reviewDocument");
  const clean = note?.trim().slice(0, 300) || undefined;
  update((d) => ({
    ...d,
    documents: d.documents.map((x) => (x.id === docId ? { ...x, status, note: status === "rejected" ? clean : undefined, reviewedAt: now() } : x)),
  }));
}

/** Admin gives the badge (approving the papers still pending) or sends the request back with a reason */
export async function decideVerification(vendorId: string, approve: boolean, note?: string) {
  const actor = currentActor();
  assert(can.reviewDocuments(actor), "decideVerification");
  const db = getDB();
  const v = db.vendors.find((x) => x.id === vendorId);
  if (!v) return;
  const clean = note?.trim().slice(0, 300) || undefined;
  update((d) => ({
    ...d,
    vendors: d.vendors.map((x) =>
      x.id !== vendorId
        ? x
        : approve
          ? { ...x, verified: true, verification: undefined, hidden: d.settings.hideUnverified ? false : x.hidden }
          : { ...x, verification: { state: "rejected", requestedAt: x.verification?.requestedAt ?? now(), reviewedAt: now(), note: clean } },
    ),
    documents: approve
      ? d.documents.map((x) => (x.vendorId === vendorId && x.status === "pending" ? { ...x, status: "approved", reviewedAt: now() } : x))
      : d.documents,
  }));
  notify(
    v.ownerId,
    "system",
    approve
      ? { ru: "Проверка пройдена — у профиля появилась отметка «Проверен»", en: "Verification passed: your profile is now marked «Verified»" }
      : { ru: `Проверка не пройдена${clean ? `: ${clean}` : ""}`, en: `Verification declined${clean ? `: ${clean}` : ""}` },
    routes.vendorProfile,
  );
}

// ── Complaints ────────────────────────────────────────────────

/** Whose content a report is about — the vendor behind a post or a review */
function complaintVendor(db: DB, target: ComplaintTarget, targetId: string): string | undefined {
  if (target === "vendor") return db.vendors.find((v) => v.id === targetId)?.id;
  if (target === "post") return db.posts.find((p) => p.id === targetId)?.vendorId;
  return db.reviews.find((r) => r.id === targetId)?.vendorId;
}

function hideTarget(d: DB, target: ComplaintTarget, targetId: string, hidden: boolean): DB {
  if (target === "vendor") return { ...d, vendors: d.vendors.map((v) => (v.id === targetId ? { ...v, hidden } : v)) };
  if (target === "post") return { ...d, posts: d.posts.map((p) => (p.id === targetId ? { ...p, hidden } : p)) };
  return { ...d, reviews: d.reviews.map((r) => (r.id === targetId ? { ...r, hidden } : r)) };
}

/** Returns false when this person already has an open report on the same thing */
export async function reportContent(target: ComplaintTarget, targetId: string, reason: ComplaintReason, text?: string): Promise<boolean> {
  const actor = currentActor();
  assert(can.report(actor), "report");
  const db = getDB();
  const vendorId = complaintVendor(db, target, targetId);
  assert(!!vendorId && db.vendors.find((v) => v.id === vendorId)?.ownerId !== actor.id, "report");
  if (db.complaints.some((c) => c.authorId === actor.id && c.targetId === targetId && c.status === "open")) return false;
  const c: Complaint = {
    id: uid("cmp"),
    authorId: actor.id,
    target,
    targetId,
    vendorId,
    reason,
    text: text?.trim().slice(0, 500) || undefined,
    status: "open",
    createdAt: now(),
  };
  const limit = db.settings.autoHideComplaints ?? 0;
  update((d) => {
    const next = { ...d, complaints: [c, ...d.complaints] };
    const open = next.complaints.filter((x) => x.targetId === targetId && x.status === "open").length;
    return limit > 0 && open >= limit ? hideTarget(next, target, targetId, true) : next;
  });
  if (db.settings.notifyOnComplaint !== false) {
    for (const a of admins()) notify(a, "system", { ru: "Новая жалоба", en: "New complaint" }, routes.adminComplaints);
  }
  return true;
}

/** Admin closes every open report on the same thing at once: hides it or keeps it */
export async function resolveComplaint(complaintId: string, hide: boolean) {
  const actor = currentActor();
  assert(can.resolveComplaint(actor), "resolveComplaint");
  const c = getDB().complaints.find((x) => x.id === complaintId);
  if (!c) return;
  update((d) => {
    const closed = {
      ...d,
      complaints: d.complaints.map((x) =>
        x.targetId === c.targetId && x.status === "open"
          ? { ...x, status: hide ? ("resolved" as const) : ("dismissed" as const), resolution: hide ? ("hidden" as const) : ("kept" as const), resolvedAt: now() }
          : x,
      ),
    };
    return hideTarget(closed, c.target, c.targetId, hide);
  });
}
