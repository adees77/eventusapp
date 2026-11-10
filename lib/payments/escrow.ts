/**
 * P2P escrow state machine (pure, no store access).
 *
 *   pending booking ──pay──▶ held ──client ✓ + vendor ✓──▶ released
 *                             │  └──cancel (before both ✓)──▶ refunded
 *                             └──dispute──▶ disputed ──admin──▶ released | refunded
 *
 * Money moves only by the ledger entries returned from each transition, so a
 * real backend can apply the same transitions inside one DB transaction.
 */
import type { Booking, Escrow, Transaction } from "@/lib/data/types";

export class EscrowError extends Error {
  constructor(public code: "state" | "party" | "reason") {
    super(`Escrow: ${code}`);
    this.name = "EscrowError";
  }
}

export type Party = "client" | "vendor";

type Ledger = Omit<Transaction, "id" | "createdAt">;

export interface Transition {
  escrow: Escrow;
  status: Booking["status"];
  ledger: Ledger[];
}

export function feeOf(amount: number, feePercent: number) {
  return Math.round((amount * feePercent) / 100);
}

export function escrowOf(b: Pick<Booking, "escrow" | "prepayAmount">): Escrow {
  return b.escrow ?? { state: "none", amount: b.prepayAmount };
}

/** Prepayment captured by the provider → frozen */
export function hold(b: Booking, at: string): Transition {
  const e = escrowOf(b);
  if (e.state !== "none" || b.status !== "pending") throw new EscrowError("state");
  return {
    escrow: { state: "held", amount: b.prepayAmount, heldAt: at },
    status: "prepaid",
    ledger: [{ kind: "hold", amount: b.prepayAmount, bookingId: b.id, vendorId: b.vendorId, clientId: b.clientId }],
  };
}

/** One side presses «Подтвердить». When both have, money goes to the vendor minus the fee. */
export function confirm(b: Booking, party: Party, at: string, feePercent: number): Transition {
  const e = escrowOf(b);
  if (e.state !== "held") throw new EscrowError("state");
  const next: Escrow = {
    ...e,
    ...(party === "client" ? { clientConfirmedAt: e.clientConfirmedAt ?? at } : { vendorConfirmedAt: e.vendorConfirmedAt ?? at }),
  };
  if (next.clientConfirmedAt && next.vendorConfirmedAt) return release(b, next, at, feePercent);
  return { escrow: next, status: b.status, ledger: [] };
}

/** A side withdraws its confirmation (only while the other hasn't confirmed yet) */
export function unconfirm(b: Booking, party: Party): Transition {
  const e = escrowOf(b);
  if (e.state !== "held") throw new EscrowError("state");
  const next = { ...e };
  if (party === "client") delete next.clientConfirmedAt;
  else delete next.vendorConfirmedAt;
  return { escrow: next, status: b.status, ledger: [] };
}

function release(b: Booking, e: Escrow, at: string, feePercent: number): Transition {
  const fee = feeOf(e.amount, feePercent);
  return {
    escrow: { ...e, state: "released", releasedAt: at },
    status: "confirmed",
    ledger: [
      { kind: "release", amount: e.amount - fee, bookingId: b.id, vendorId: b.vendorId, clientId: b.clientId },
      { kind: "fee", amount: fee, bookingId: b.id, vendorId: b.vendorId },
    ],
  };
}

/** Cancel before the deal is agreed: the client gets the frozen money back */
export function refund(b: Booking, at: string): Transition {
  const e = escrowOf(b);
  if (e.state !== "held") throw new EscrowError("state");
  return {
    escrow: { ...e, state: "refunded", refundedAt: at },
    status: "cancelled",
    ledger: [{ kind: "refund", amount: e.amount, bookingId: b.id, vendorId: b.vendorId, clientId: b.clientId }],
  };
}

export function openDispute(b: Booking, by: string, reason: string, at: string): Transition {
  const e = escrowOf(b);
  if (e.state !== "held") throw new EscrowError("state");
  const clean = reason.trim().slice(0, 600);
  if (!clean) throw new EscrowError("reason");
  return { escrow: { ...e, state: "disputed", dispute: { by, reason: clean, openedAt: at } }, status: b.status, ledger: [] };
}

/** Admin decision */
export function resolveDispute(b: Booking, resolution: "release" | "refund", at: string, feePercent: number): Transition {
  const e = escrowOf(b);
  if (e.state !== "disputed" || !e.dispute) throw new EscrowError("state");
  const resolved: Escrow = { ...e, state: "held", dispute: { ...e.dispute, resolution, resolvedAt: at } };
  const t = resolution === "release" ? release(b, resolved, at, feePercent) : refund({ ...b, escrow: resolved }, at);
  return { ...t, escrow: { ...t.escrow, dispute: resolved.dispute } };
}

// ── Balances (derived from the ledger) ────────────────────────

export interface VendorBalance {
  /** frozen in deals that are not agreed yet */
  held: number;
  /** released, not yet paid out */
  available: number;
  paidOut: number;
  /** all-time released to the vendor (net of fee) */
  earned: number;
  fees: number;
}

export function vendorBalance(
  vendorId: string,
  bookings: Pick<Booking, "vendorId" | "escrow" | "prepayAmount">[],
  ledger: Transaction[],
): VendorBalance {
  const mine = ledger.filter((t) => t.vendorId === vendorId);
  const sum = (k: Transaction["kind"]) => mine.filter((t) => t.kind === k).reduce((s, t) => s + t.amount, 0);
  const held = bookings
    .filter((b) => b.vendorId === vendorId && (b.escrow?.state === "held" || b.escrow?.state === "disputed"))
    .reduce((s, b) => s + escrowOf(b).amount, 0);
  const earned = sum("release");
  const paidOut = sum("payout");
  return { held, available: earned - paidOut, paidOut, earned, fees: sum("fee") };
}

export interface ClientMoney {
  held: number;
  released: number;
  refunded: number;
}

export function clientMoney(clientId: string, bookings: Pick<Booking, "clientId" | "escrow" | "prepayAmount">[]): ClientMoney {
  const mine = bookings.filter((b) => b.clientId === clientId && b.escrow);
  const by = (states: string[]) => mine.filter((b) => states.includes(b.escrow!.state)).reduce((s, b) => s + b.escrow!.amount, 0);
  return { held: by(["held", "disputed"]), released: by(["released"]), refunded: by(["refunded"]) };
}
