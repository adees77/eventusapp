import { beforeEach, describe, expect, it } from "vitest";
import { upsertAuthUser } from "../actions";
import { buildSeed, TEST_ACCOUNTS } from "../seed";
import { getDB, migrate, useDataStore } from "../store";

describe("test accounts", () => {
  beforeEach(() => useDataStore.setState({ db: buildSeed(), hydrated: true }));

  it("email sign-in lands in the seeded motorcade vendor, not a new user", () => {
    const acc = TEST_ACCOUNTS.find((a) => a.kind === "vendorCars")!;
    const users = getDB().users.length;
    const u = upsertAuthUser({ email: acc.email.toUpperCase(), provider: "email" });
    expect(u.id).toBe(acc.userId);
    expect(u.role).toBe("vendor");
    expect(getDB().users.length).toBe(users);
    const vendor = getDB().vendors.find((v) => v.ownerId === u.id)!;
    expect(vendor.category).toBe("cars");
    expect(getDB().offers.filter((o) => o.vendorId === vendor.id).length).toBeGreaterThan(0);
    expect(getDB().bookings.filter((b) => b.vendorId === vendor.id).length).toBeGreaterThan(0);
  });

  it("older saved demos get the test email through migration", () => {
    const db = buildSeed();
    const old = { ...db, users: db.users.map((u) => ({ ...u, email: undefined })) };
    const acc = TEST_ACCOUNTS[0];
    expect(migrate(old).users.find((u) => u.id === acc.userId)?.email).toBe(acc.email);
  });
});
