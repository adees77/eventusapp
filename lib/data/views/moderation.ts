"use client";

/** Verification queue, documents and complaints (admin) + the vendor's own papers. */
import { missingDocs } from "../policies";
import { useDB } from "../store";
import type { Complaint, DB, LText, VendorDocument } from "../types";
import { nameOf } from "./_shared";
import { routes } from "@/lib/routes";

// ── Verification ──────────────────────────────────────────────

export function selectVerificationQueue(db: DB) {
  const byState = (s: "pending" | "rejected") =>
    db.vendors
      .filter((v) => v.verification?.state === s)
      .sort((a, b) => (a.verification!.requestedAt ?? "").localeCompare(b.verification!.requestedAt ?? ""))
      .map((v) => ({ vendor: v, categoryName: db.categories.find((c) => c.id === v.category)?.name }));
  return { pending: byState("pending"), rejected: byState("rejected"), docsCount: db.documents.length };
}
export const useVerificationQueue = () => useDB(selectVerificationQueue);

/** One vendor's papers against the platform's required list */
export function selectVendorDocs(db: DB, vendorId: string) {
  const docs = db.documents.filter((x) => x.vendorId === vendorId);
  const required = db.settings.requiredDocs ?? [];
  const missing = missingDocs(db, vendorId);
  const rejected = docs.filter((x) => x.status === "rejected" && required.includes(x.kind)).map((x) => x.kind);
  return { docs, required, missing, blockers: [...missing, ...rejected] };
}
export const useVendorDocs = (vendorId: string) => useDB((db) => selectVendorDocs(db, vendorId));

export function selectDocsRegistry(db: DB, f: VendorDocument["status"] | "all") {
  const rows = db.documents
    .filter((d) => f === "all" || d.status === f)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
    .map((d) => {
      const v = db.vendors.find((x) => x.id === d.vendorId);
      return { doc: d, vendorName: v?.name, vendorSlug: v?.slug };
    });
  const count = (s: VendorDocument["status"]) => db.documents.filter((d) => d.status === s).length;
  return { rows, counts: { pending: count("pending"), approved: count("approved"), rejected: count("rejected") } };
}
export const useDocsRegistry = (f: VendorDocument["status"] | "all") => useDB((db) => selectDocsRegistry(db, f));

// ── Complaints ────────────────────────────────────────────────

/** What a report points at: a link, a preview and whether it is hidden right now */
export interface ComplaintTargetInfo {
  vendorName?: string;
  caption?: LText;
  review?: { author: string; text: LText };
  href?: string;
  hidden: boolean;
  photo?: string;
}

function targetOf(db: DB, c: Complaint): ComplaintTargetInfo {
  if (c.target === "vendor") {
    const v = db.vendors.find((x) => x.id === c.targetId);
    return { vendorName: v?.name, href: v ? routes.vendor(v.slug) : undefined, hidden: !!v?.hidden, photo: v?.cover };
  }
  if (c.target === "post") {
    const p = db.posts.find((x) => x.id === c.targetId);
    return { caption: p?.caption, href: p ? routes.post(p.id) : undefined, hidden: !!p?.hidden, photo: p?.photos[0] };
  }
  const r = db.reviews.find((x) => x.id === c.targetId);
  const v = db.vendors.find((x) => x.id === r?.vendorId);
  return {
    review: r && { author: r.author, text: r.text },
    href: v ? routes.vendor(v.slug, "reviews") : undefined,
    hidden: !!r?.hidden,
  };
}

export function selectComplaints(db: DB, f: "open" | "closed") {
  const open = db.complaints.filter((c) => c.status === "open");
  const withAuthor = (c: Complaint) => ({ complaint: c, authorName: nameOf(db, c.authorId) });
  // one card per reported thing: several people may report the same post
  const rows = (f === "open" ? open : db.complaints.filter((c) => c.status !== "open"))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((c, i, a) => f === "closed" || a.findIndex((x) => x.targetId === c.targetId) === i)
    .map((c) => ({
      complaint: c,
      target: targetOf(db, c),
      vendorName: db.vendors.find((v) => v.id === c.vendorId)?.name,
      reports: (f === "open" ? open.filter((x) => x.targetId === c.targetId) : [c]).map(withAuthor),
    }));
  return { rows, openCount: open.length, closedCount: db.complaints.length - open.length };
}
export const useComplaints = (f: "open" | "closed") => useDB((db) => selectComplaints(db, f));
