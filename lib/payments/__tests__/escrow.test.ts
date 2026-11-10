import { describe, expect, it } from "vitest";
import type { Booking, Transaction } from "@/lib/data/types";
import * as e from "../escrow";

const base: Booking = {
  id: "b1",
  offerId: "o1",
  vendorId: "v1",
  clientId: "u1",
  date: "2026-12-01",
  qty: 1,
  total: 100000,
  prepayAmount: 30000,
  status: "pending",
  createdAt: "2026-11-01T00:00:00Z",
};
const T = "2026-11-02T00:00:00Z";
const apply = (b: Booking, t: e.Transition): Booking => ({ ...b, escrow: t.escrow, status: t.status });

describe("escrow", () => {
  it("holds the prepayment on pay", () => {
    const t = e.hold(base, T);
    expect(t.escrow.state).toBe("held");
    expect(t.status).toBe("prepaid");
    expect(t.ledger).toEqual([expect.objectContaining({ kind: "hold", amount: 30000 })]);
  });

  it("cannot hold twice", () => {
    const held = apply(base, e.hold(base, T));
    expect(() => e.hold(held, T)).toThrow(e.EscrowError);
  });

  it("releases only after both sides confirm, minus the fee", () => {
    const held = apply(base, e.hold(base, T));
    const one = e.confirm(held, "client", T, 5);
    expect(one.escrow.state).toBe("held");
    expect(one.ledger).toHaveLength(0);
    // confirming twice from the same side changes nothing
    const again = e.confirm(apply(held, one), "client", T, 5);
    expect(again.escrow.state).toBe("held");
    const both = e.confirm(apply(held, one), "vendor", T, 5);
    expect(both.escrow.state).toBe("released");
    expect(both.status).toBe("confirmed");
    expect(both.ledger).toEqual([
      expect.objectContaining({ kind: "release", amount: 28500 }),
      expect.objectContaining({ kind: "fee", amount: 1500 }),
    ]);
  });

  it("can withdraw a confirmation while the other side has not confirmed", () => {
    const held = apply(base, e.hold(base, T));
    const one = apply(held, e.confirm(held, "vendor", T, 5));
    const back = e.unconfirm(one, "vendor");
    expect(back.escrow.vendorConfirmedAt).toBeUndefined();
  });

  it("refunds on cancel and blocks later confirmation", () => {
    const held = apply(base, e.hold(base, T));
    const r = e.refund(held, T);
    expect(r.escrow.state).toBe("refunded");
    expect(r.status).toBe("cancelled");
    expect(() => e.confirm(apply(held, r), "client", T, 5)).toThrow();
  });

  it("dispute needs a reason and freezes until admin resolves", () => {
    const held = apply(base, e.hold(base, T));
    expect(() => e.openDispute(held, "u1", "  ", T)).toThrow();
    const d = apply(held, e.openDispute(held, "u1", "Не приехали", T));
    expect(d.escrow!.state).toBe("disputed");
    expect(() => e.confirm(d, "vendor", T, 5)).toThrow();
    const rel = e.resolveDispute(d, "release", T, 5);
    expect(rel.escrow.state).toBe("released");
    expect(rel.escrow.dispute?.resolution).toBe("release");
    const ref = e.resolveDispute(d, "refund", T, 5);
    expect(ref.escrow.state).toBe("refunded");
  });

  it("derives balances from the ledger", () => {
    const held = apply(base, e.hold(base, T));
    const both = e.confirm(apply(held, e.confirm(held, "client", T, 5)), "vendor", T, 5);
    const ledger: Transaction[] = [...e.hold(base, T).ledger, ...both.ledger, { kind: "payout" as const, amount: 8500, vendorId: "v1" }].map((x, i) => ({
      ...x,
      id: `t${i}`,
      createdAt: T,
    }));
    const other: Booking = { ...held, id: "b2" };
    const bal = e.vendorBalance("v1", [apply(base, both), other], ledger);
    expect(bal).toEqual({ held: 30000, available: 20000, paidOut: 8500, earned: 28500, fees: 1500 });
    expect(e.clientMoney("u1", [apply(base, both), other])).toEqual({ held: 30000, released: 30000, refunded: 0 });
  });
});
