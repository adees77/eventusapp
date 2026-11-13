import { subDays, subHours } from "date-fns";
import { demoConfig } from "@/config/demo";
import type { Complaint, DocKind, PlatformSettings, Post, Review, Vendor, VendorDocument } from "../types";

export const DEFAULT_SETTINGS = (fee: number): PlatformSettings => ({
  feePercent: fee,
  defaultPrepayPercent: demoConfig.defaultPrepayPercent,
  autoReleaseDays: 3,
  requiredDocs: ["passport", "registration"],
  autoHideComplaints: 3,
  lowRatingThreshold: 3,
  notifyOnComplaint: true,
  hideUnverified: false,
  supportPhone: "+996 555 000 777",
  supportEmail: "support@eventus.kg",
});

const file = (v: Vendor, kind: DocKind) =>
  ({ passport: `passport-${v.slug}.pdf`, registration: `svidetelstvo-ip-${v.slug}.pdf`, license: `license-${v.slug}.pdf`, contract: `dogovor-${v.slug}.pdf` })[kind];

/**
 * Verified vendors have approved papers; the first unverified ones wait in the admin queue,
 * one of them with a rejected scan so the «rejected» state is visible too.
 */
export function buildDocuments(vendors: Vendor[], now: Date): { documents: VendorDocument[]; vendors: Vendor[] } {
  const documents: VendorDocument[] = [];
  let queued = 0;
  const out = vendors.map((v, i) => {
    const doc = (kind: DocKind, status: VendorDocument["status"], at: Date, note?: string): VendorDocument => ({
      id: `doc-${v.id}-${kind}`,
      vendorId: v.id,
      kind,
      fileName: file(v, kind),
      status,
      note,
      uploadedAt: at.toISOString(),
      reviewedAt: status === "pending" ? undefined : at.toISOString(),
    });
    if (v.verified) {
      const at = subDays(now, 40 + i);
      documents.push(doc("passport", "approved", at), doc("registration", "approved", at));
      return v;
    }
    if (queued >= 4) return v;
    queued++;
    const at = subHours(now, 6 + queued * 9);
    if (queued === 3) {
      documents.push(
        doc("passport", "approved", at),
        doc("registration", "rejected", at, "Скан нечитаемый — загрузите фото целиком, без бликов"),
      );
      return { ...v, verification: { state: "rejected" as const, requestedAt: at.toISOString(), reviewedAt: at.toISOString(), note: "Переснимите свидетельство ИП" } };
    }
    documents.push(doc("passport", "pending", at), doc("registration", "pending", at));
    if (queued === 2) documents.push(doc("license", "pending", at));
    return { ...v, verification: { state: "pending" as const, requestedAt: at.toISOString() } };
  });
  return { documents, vendors: out };
}

/** A handful of open and closed reports so the complaints queue is not empty */
export function buildComplaints(vendors: Vendor[], posts: Post[], reviews: Review[], now: Date): Complaint[] {
  const authors = ["u-client-2", "u-client-3", "u-client-4", "u-client-5"];
  const out: Complaint[] = [];
  const v0 = vendors.find((v) => !v.verified);
  if (v0) {
    out.push({
      id: "cmp-1",
      authorId: authors[0],
      target: "vendor",
      targetId: v0.id,
      vendorId: v0.id,
      reason: "fraud",
      text: "Просили перевести предоплату на карту в обход EVENTUS",
      status: "open",
      createdAt: subHours(now, 3).toISOString(),
    });
  }
  const p = posts[7];
  if (p) {
    out.push({
      id: "cmp-2",
      authorId: authors[1],
      target: "post",
      targetId: p.id,
      vendorId: p.vendorId,
      reason: "fake",
      text: "Это фото другой компании, видела его в Instagram",
      status: "open",
      createdAt: subHours(now, 20).toISOString(),
    });
  }
  const r = reviews.find((x) => x.rating <= 3) ?? reviews[0];
  if (r) {
    out.push({
      id: "cmp-3",
      authorId: authors[2],
      target: "review",
      targetId: r.id,
      vendorId: r.vendorId,
      reason: "offensive",
      status: "open",
      createdAt: subDays(now, 1).toISOString(),
    });
  }
  const p2 = posts[15];
  if (p2) {
    out.push({
      id: "cmp-4",
      authorId: authors[3],
      target: "post",
      targetId: p2.id,
      vendorId: p2.vendorId,
      reason: "spam",
      status: "dismissed",
      resolution: "kept",
      createdAt: subDays(now, 6).toISOString(),
      resolvedAt: subDays(now, 5).toISOString(),
    });
  }
  return out;
}
