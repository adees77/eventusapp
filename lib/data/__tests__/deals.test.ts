import { describe, expect, it } from "vitest";
import { isFinishedDeal } from "../policies";

describe("isFinishedDeal", () => {
  it("counts completed and paid-out deals", () => {
    expect(isFinishedDeal({ status: "completed" })).toBe(true);
    expect(isFinishedDeal({ status: "confirmed", escrow: { state: "released", amount: 1, heldAt: "" } })).toBe(true);
  });
  it("never counts a cancelled booking, even after the payout", () => {
    expect(isFinishedDeal({ status: "cancelled", escrow: { state: "released", amount: 1, heldAt: "" } })).toBe(false);
  });
  it("does not count held or pending money", () => {
    expect(isFinishedDeal({ status: "prepaid", escrow: { state: "held", amount: 1, heldAt: "" } })).toBe(false);
    expect(isFinishedDeal({ status: "pending" })).toBe(false);
  });
});
