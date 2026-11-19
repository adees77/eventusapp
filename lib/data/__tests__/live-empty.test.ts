import { describe, expect, it } from "vitest";
import { buildLiveSeed, buildSeed } from "../seed";
import { migrate, withoutDemoCatalog } from "../store";
import type { DB } from "../types";

describe("live mode starts empty", () => {
  it("the live seed has no demo vendors, users, posts or reviews", () => {
    const live = buildLiveSeed();
    expect(live.users).toEqual([]);
    expect(live.vendors).toEqual([]);
    expect(live.posts).toEqual([]);
    expect(live.reviews).toEqual([]);
    expect(live.categories.length).toBeGreaterThan(0);
    expect(live.demoCatalogRemoved).toBe(true);
  });

  it("an old live database loses the demo catalog but keeps real sign-ups", () => {
    const demo = buildSeed();
    const seeded = demo.vendors[0];
    const real: DB["vendors"][number] = { ...seeded, id: "v-real", slug: "real", ownerId: "u-real" };
    const old: DB = {
      ...demo,
      users: [...demo.users, { id: "u-real", role: "vendor", name: "Real" } as DB["users"][number]],
      vendors: [...demo.vendors, real],
      offers: [...demo.offers, { ...demo.offers.find((o) => o.vendorId === seeded.id)!, id: "o-real", vendorId: "v-real" }],
    };
    const clean = withoutDemoCatalog(old, demo);
    expect(clean.vendors.map((v) => v.id)).toEqual(["v-real"]);
    expect(clean.users.map((u) => u.id)).toEqual(["u-real"]);
    expect(clean.offers.map((o) => o.id)).toEqual(["o-real"]);
    expect(clean.posts).toEqual([]);
    expect(clean.bookings).toEqual([]);
    expect(clean.messages).toEqual([]);
  });

  it("migrate cleans only live databases, and only once", () => {
    const demo = buildSeed();
    expect(migrate(demo, "demo").vendors.length).toBe(demo.vendors.length);
    const live = migrate(demo, "live");
    expect(live.vendors).toEqual([]);
    expect(migrate(live, "live")).toBe(live);
  });
});
