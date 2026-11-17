import { beforeEach, describe, expect, it } from "vitest";
import { asActor, currentActor, toggleFavorite } from "../actions";
import { buildSeed, DEMO_CLIENT_ID, demoVendorOwnerId } from "../seed";
import { getDB, useDataStore } from "../store";
import { selectAdminBookings, selectDisputes } from "../views/admin";
import { selectClientBookings } from "../views/bookings";
import { selectThread } from "../views/messaging";
import { selectVendorOverview } from "../views/vendor";
import { useSession } from "@/lib/session";

const client = { id: DEMO_CLIENT_ID, role: "client" as const };

describe("acting user", () => {
  beforeEach(() => useDataStore.setState({ db: buildSeed(), hydrated: true }));

  it("actions act as the tab's session, never as a caller-picked user", async () => {
    useSession.setState({ id: DEMO_CLIENT_ID, role: "client" });
    expect(currentActor()).toEqual(client);
    const vendorId = getDB().vendors[0].id;
    const had = getDB().favorites.some((f) => f.userId === DEMO_CLIENT_ID && f.vendorId === vendorId);
    await toggleFavorite(vendorId);
    expect(getDB().favorites.some((f) => f.userId === DEMO_CLIENT_ID && f.vendorId === vendorId)).toBe(!had);
  });

  it("asActor switches the user only inside the callback and fails closed on policy", async () => {
    useSession.setState({ id: DEMO_CLIENT_ID, role: "client" });
    await expect(asActor({ id: demoVendorOwnerId, role: "vendor" }, () => toggleFavorite(getDB().vendors[0].id))).rejects.toThrow();
    expect(currentActor()).toEqual(client);
  });
});

describe("views", () => {
  beforeEach(() => useDataStore.setState({ db: buildSeed(), hydrated: true }));

  it("booking rows carry their joins", () => {
    const rows = selectClientBookings(getDB(), DEMO_CLIENT_ID);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.booking.clientId).toBe(DEMO_CLIENT_ID);
      expect(r.vendorName).not.toBe("");
      expect(r.offerTitle).toBeDefined();
    }
  });

  it("admin search filters by vendor or client name", () => {
    const db = getDB();
    const all = selectAdminBookings(db, "");
    expect(all.rows).toHaveLength(db.bookings.length);
    const one = all.rows[0];
    expect(selectAdminBookings(db, one.vendorName).rows.every((r) => `${r.vendorName} ${r.clientName}`.includes(one.vendorName))).toBe(true);
    expect(selectAdminBookings(db, "no-such-thing-xyz").rows).toHaveLength(0);
  });

  it("dispute counters add up to the escrowed bookings", () => {
    const db = getDB();
    const { counts, rows } = selectDisputes(db, "all");
    expect(rows).toHaveLength(db.bookings.filter((b) => b.escrow).length);
    expect(Object.values(counts).reduce((s, n) => s + n, 0)).toBe(db.bookings.filter((b) => b.escrow).length);
  });

  it("a chat is invisible to someone outside it", () => {
    const db = getDB();
    const conv = db.conversations[0];
    expect(selectThread(db, { id: conv.clientId, role: "client" }, conv.id).conversation?.id).toBe(conv.id);
    expect(selectThread(db, { id: "u-nobody", role: "client" }, conv.id).conversation).toBeUndefined();
  });

  it("vendor overview is scoped to the vendor", () => {
    const db = getDB();
    const v = db.vendors.find((x) => x.ownerId === demoVendorOwnerId)!;
    const o = selectVendorOverview(db, v.id);
    expect(o.bookings.every((r) => r.booking.vendorId === v.id)).toBe(true);
    expect(o.views).toBeGreaterThanOrEqual(0);
  });
});

describe("session role", () => {
  beforeEach(() => useDataStore.setState({ db: buildSeed(), hydrated: true }));

  it("comes from the account, not from the caller", () => {
    useSession.getState().setRole("admin", DEMO_CLIENT_ID);
    expect(useSession.getState().role).toBe("client");
    useSession.getState().reset();
    expect(useSession.getState()).toMatchObject({ id: DEMO_CLIENT_ID, role: "client", bound: false });
  });
});
