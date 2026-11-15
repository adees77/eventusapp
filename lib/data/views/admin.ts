"use client";

/** Admin panel views (/admin/*). Supabase: admin-only queries / RPCs behind is_admin(). */
import { eachWeekOfInterval, endOfWeek, subWeeks } from "date-fns";
import { likeCount } from "../feed";
import { useDB } from "../store";
import type { DB, EscrowState, Review, Role, TransactionKind, User } from "../types";
import { bookingView, nameOf, vendorNameOf } from "./_shared";

// ── Overview ──────────────────────────────────────────────────

export function selectAdminOverview(db: DB, now = new Date()) {
  const sum = (k: TransactionKind) => db.transactions.filter((x) => x.kind === k).reduce((s, x) => s + x.amount, 0);
  const weeks = eachWeekOfInterval({ start: subWeeks(now, 11), end: now }, { weekStartsOn: 1 }).map((start) => {
    const end = endOfWeek(start, { weekStartsOn: 1 });
    const inWeek = (iso?: string) => !!iso && new Date(iso) >= start && new Date(iso) <= end;
    return {
      start,
      end,
      gmv: db.transactions.filter((x) => x.kind === "hold" && inWeek(x.createdAt)).reduce((s, x) => s + x.amount, 0),
      users: db.users.filter((u) => inWeek(u.createdAt)).length,
    };
  });
  const top = db.vendors
    .map((v) => ({ v, value: db.transactions.filter((x) => x.vendorId === v.id && x.kind === "hold").reduce((s, x) => s + x.amount, 0) }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  return {
    revenue: sum("fee"),
    gmv: db.bookings.filter((b) => b.status !== "cancelled" && b.escrow).reduce((s, b) => s + b.total, 0),
    held: db.bookings
      .filter((b) => b.escrow?.state === "held" || b.escrow?.state === "disputed")
      .reduce((s, b) => s + (b.escrow?.amount ?? 0), 0),
    disputes: db.bookings.filter((b) => b.escrow?.state === "disputed"),
    clients: db.users.filter((u) => u.role === "client").length,
    vendors: db.vendors.length,
    feePercent: db.settings.feePercent,
    weeks,
    top,
  };
}
export const useAdminOverview = () => useDB((db) => selectAdminOverview(db));

/** Badge counters in the admin nav */
export const selectAdminCounters = (db: DB) => ({
  disputes: db.bookings.filter((b) => b.escrow?.state === "disputed").length,
  waiting: db.vendors.filter((v) => v.verification?.state === "pending").length,
  complaints: new Set(db.complaints.filter((c) => c.status === "open").map((c) => c.targetId)).size,
});
export const useAdminCounters = () => useDB(selectAdminCounters);

// ── Bookings & disputes ───────────────────────────────────────

export function selectAdminBookings(db: DB, q: string) {
  const needle = q.trim().toLowerCase();
  const rows = db.bookings
    .map((b) => bookingView(db, b))
    .filter((r) => !needle || `${r.vendorName} ${r.clientName} ${r.booking.id}`.toLowerCase().includes(needle))
    .sort((a, b) => b.booking.createdAt.localeCompare(a.booking.createdAt));
  return { rows, total: db.bookings.length };
}
export const useAdminBookings = (q: string) => useDB((db) => selectAdminBookings(db, q));

const ESCROW_STATES: EscrowState[] = ["none", "held", "released", "refunded", "disputed"];

export function selectDisputes(db: DB, filter: EscrowState | "all") {
  const opened = (b: DB["bookings"][number]) => b.escrow?.dispute?.openedAt ?? b.escrow?.heldAt ?? "";
  const rows = db.bookings
    .filter((b) => b.escrow && (filter === "all" || b.escrow.state === filter))
    .sort((a, b) => opened(b).localeCompare(opened(a)))
    .map((b) => ({ ...bookingView(db, b), disputeByName: nameOf(db, b.escrow?.dispute?.by) }));
  const counts = Object.fromEntries(ESCROW_STATES.map((s) => [s, db.bookings.filter((b) => b.escrow?.state === s).length])) as Record<
    EscrowState,
    number
  >;
  return { rows, counts };
}
export const useDisputes = (filter: EscrowState | "all") => useDB((db) => selectDisputes(db, filter));

// ── Money ─────────────────────────────────────────────────────

export function selectAdminFinance(db: DB, kind: TransactionKind | "all") {
  const totals = (k: TransactionKind) => db.transactions.filter((x) => x.kind === k).reduce((s, x) => s + x.amount, 0);
  const rows = db.transactions
    .filter((x) => kind === "all" || x.kind === kind)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((x) => ({ tx: x, vendorName: vendorNameOf(db, x.vendorId), clientName: nameOf(db, x.clientId) }));
  const sums = Object.fromEntries((["hold", "release", "fee", "refund", "payout"] as TransactionKind[]).map((k) => [k, totals(k)])) as Record<
    TransactionKind,
    number
  >;
  return { rows, sums };
}
export const useAdminFinance = (kind: TransactionKind | "all") => useDB((db) => selectAdminFinance(db, kind));

// ── Content & users ───────────────────────────────────────────

export type ReviewFilter = "low" | "all" | "hidden";

export function selectAdminReviews(db: DB, f: ReviewFilter) {
  const low = db.settings.lowRatingThreshold ?? 3;
  const match = (r: Review) => (f === "low" ? r.rating <= low : f === "hidden" ? !!r.hidden : true);
  return {
    rows: db.reviews
      .filter(match)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 80)
      .map((r) => ({ review: r, vendorName: vendorNameOf(db, r.vendorId) })),
    lowCount: db.reviews.filter((r) => r.rating <= low).length,
    hiddenCount: db.reviews.filter((r) => r.hidden).length,
  };
}
export const useAdminReviews = (f: ReviewFilter) => useDB((db) => selectAdminReviews(db, f));

export function selectAdminUsers(db: DB, q: string, role: Role | "all") {
  const needle = q.trim().toLowerCase();
  const match = (u: User) => (role === "all" || u.role === role) && (!needle || `${u.name} ${u.email ?? ""}`.toLowerCase().includes(needle));
  return {
    rows: db.users
      .filter(match)
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .map((u) => ({ user: u, bookings: db.bookings.filter((b) => b.clientId === u.id).length })),
    total: db.users.length,
  };
}
export const useAdminUsers = (q: string, role: Role | "all") => useDB((db) => selectAdminUsers(db, q, role));

export function selectAdminPosts(db: DB, f: "recent" | "hidden") {
  return {
    rows: db.posts
      .filter((p) => (f === "hidden" ? p.hidden : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 60)
      .map((p) => ({ post: p, vendorName: vendorNameOf(db, p.vendorId), likes: likeCount(db, p) })),
    total: db.posts.length,
    hiddenCount: db.posts.filter((p) => p.hidden).length,
  };
}
export const useAdminPosts = (f: "recent" | "hidden") => useDB((db) => selectAdminPosts(db, f));

// ── Vendors ───────────────────────────────────────────────────

export type AdminVendorFilter = "all" | "unverified" | "hidden";

export function selectAdminVendors(db: DB, q: string, f: AdminVendorFilter) {
  const needle = q.trim().toLowerCase();
  return {
    rows: db.vendors
      .filter((v) => !needle || `${v.name} ${v.slug}`.toLowerCase().includes(needle))
      .filter((v) => (f === "unverified" ? !v.verified : f === "hidden" ? v.hidden : true))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((v) => ({ vendor: v, activeOffers: db.offers.filter((o) => o.vendorId === v.id && o.active).length })),
    total: db.vendors.length,
    unverified: db.vendors.filter((v) => !v.verified).length,
    hidden: db.vendors.filter((v) => v.hidden).length,
  };
}
export const useAdminVendors = (q: string, f: AdminVendorFilter) => useDB((db) => selectAdminVendors(db, q, f));
