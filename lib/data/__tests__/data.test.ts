import { describe, expect, it } from "vitest";
import { getAvailability } from "../availability";
import { can } from "../policies";
import { buildSeed, DEMO_CLIENT_ID, demoVendorOwnerId, nextDate } from "../seed";
import type { Booking } from "../types";

const db = buildSeed(new Date("2026-11-08T10:00:00"));

describe("seed", () => {
  it("has vendors in every category with offers", () => {
    for (const c of db.categories) {
      expect(db.vendors.some((v) => v.category === c.id)).toBe(true);
    }
    for (const v of db.vendors) {
      expect(db.offers.some((o) => o.vendorId === v.id)).toBe(true);
    }
  });

  it("has unique ids", () => {
    const ids = [...db.vendors, ...db.offers, ...db.bookings, ...db.users].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("puts the wedding on the next June 14", () => {
    expect(db.events[0].date).toBe("2027-06-14");
    expect(nextDate(5, 14, new Date("2027-06-14T08:00:00")).getFullYear()).toBe(2027);
  });
});

describe("availability", () => {
  const offer = db.offers.find((o) => o.id === "o-altyn-kortezh-1")!;

  it("never goes below zero and never exceeds total", () => {
    for (let d = 1; d <= 28; d++) {
      const a = getAvailability(db, offer, `2027-06-${String(d).padStart(2, "0")}`);
      expect(a.free).toBeGreaterThanOrEqual(0);
      expect(a.free).toBeLessThanOrEqual(offer.totalUnits);
    }
  });

  it("subtracts holding bookings and manual blocks", () => {
    const date = "2027-03-03";
    const base = getAvailability({ blocks: [], bookings: [] }, offer, date);
    const booking: Booking = {
      id: "t",
      offerId: offer.id,
      vendorId: offer.vendorId,
      clientId: DEMO_CLIENT_ID,
      date,
      qty: 2,
      total: 0,
      prepayAmount: 0,
      status: "prepaid",
      createdAt: "",
    };
    const withBooking = getAvailability({ blocks: [], bookings: [booking] }, offer, date);
    expect(withBooking.free).toBe(Math.max(0, base.free - 2));

    const cancelled = getAvailability({ blocks: [], bookings: [{ ...booking, status: "cancelled" }] }, offer, date);
    expect(cancelled.free).toBe(base.free);

    const blocked = getAvailability({ blocks: [{ id: "b", offerId: offer.id, date, units: 8 }], bookings: [] }, offer, date);
    expect(blocked.free).toBe(0);
  });
});

describe("policies", () => {
  const client = { id: DEMO_CLIENT_ID, role: "client" as const };
  const vendorOwner = { id: demoVendorOwnerId, role: "vendor" as const };
  const otherVendor = { id: "u-grand-drive", role: "vendor" as const };
  const admin = { id: "u-admin", role: "admin" as const };
  const myVendor = db.vendors.find((v) => v.ownerId === demoVendorOwnerId)!;

  it("vendor edits only own profile", () => {
    expect(can.editVendor(vendorOwner, myVendor)).toBe(true);
    expect(can.editVendor(otherVendor, myVendor)).toBe(false);
    expect(can.editVendor(client, myVendor)).toBe(false);
    expect(can.editVendor(admin, myVendor)).toBe(true);
  });

  it("only admin hides or verifies", () => {
    expect(can.setVendorHidden(vendorOwner)).toBe(false);
    expect(can.setVendorVerified(admin)).toBe(true);
  });

  it("hidden vendors are invisible to the public", () => {
    const hidden = { ...myVendor, hidden: true };
    expect(can.viewVendor(null, hidden)).toBe(false);
    expect(can.viewVendor(client, hidden)).toBe(false);
    expect(can.viewVendor(vendorOwner, hidden)).toBe(true);
  });

  it("booking visibility is limited to participants", () => {
    const b = db.bookings.find((x) => x.id === "b-ak-1")!;
    expect(can.viewBooking(vendorOwner, db, b)).toBe(true);
    expect(can.viewBooking(otherVendor, db, b)).toBe(false);
    expect(can.viewBooking(client, db, b)).toBe(false);
  });

  it("clients book only for themselves", () => {
    expect(can.createBooking(client, DEMO_CLIENT_ID)).toBe(true);
    expect(can.createBooking(client, "u-client-2")).toBe(false);
    expect(can.createBooking(vendorOwner, demoVendorOwnerId)).toBe(false);
  });
});
