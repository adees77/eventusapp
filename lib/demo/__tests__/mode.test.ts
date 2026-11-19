import { beforeEach, describe, expect, it } from "vitest";
import { useAuth } from "@/lib/auth/store";
import { baselineBlocked } from "@/lib/data/availability";
import { buildLiveSeed, DEMO_CLIENT_ID, demoVendorOwnerId } from "@/lib/data/seed";
import { DB_STORAGE_KEYS, getDB, useDataStore } from "@/lib/data/store";
import { useSession } from "@/lib/session";
import { demoFeature, getMode, useModeStore } from "../mode";
import { enterMode } from "../switch";

describe("data modes", () => {
  beforeEach(() => {
    useAuth.getState().signOut();
  });

  it("the live database starts empty: categories only, none of the demo's catalog, people or activity", () => {
    const db = buildLiveSeed();
    expect(db.categories.length).toBeGreaterThan(0);
    for (const k of ["users", "vendors", "offers", "posts", "reviews", "bookings", "conversations", "messages", "events", "invitations", "transactions", "notifications"] as const) {
      expect(db[k]).toHaveLength(0);
    }
  });

  it("«Посмотреть демо» swaps to the demo database; leaving it comes back to live", () => {
    expect(getMode()).toBe("live");
    expect(getDB().bookings).toHaveLength(0);
    useAuth.getState().signInDemo();
    expect(getMode()).toBe("demo");
    expect(useDataStore.persist.getOptions().name).toBe(DB_STORAGE_KEYS.demo);
    expect(getDB().bookings.length).toBeGreaterThan(0);
    expect(useSession.getState()).toMatchObject({ id: DEMO_CLIENT_ID, role: "client" });
    useAuth.getState().signOut();
    expect(getMode()).toBe("live");
    expect(useDataStore.persist.getOptions().name).toBe(DB_STORAGE_KEYS.live);
    expect(getDB().users.some((u) => u.id === DEMO_CLIENT_ID)).toBe(false);
  });

  it("a test account opens the demo as that account", () => {
    useAuth.getState().signInDemo(demoVendorOwnerId);
    expect(getMode()).toBe("demo");
    expect(useSession.getState()).toMatchObject({ id: demoVendorOwnerId, role: "vendor" });
    useAuth.getState().signInDemo("u-stranger");
    expect(useAuth.getState().userId).toBe(demoVendorOwnerId);
  });

  it("demo tricks run only inside the demo", () => {
    const offer = getDB().offers[0];
    expect(demoFeature("roleSwitcher")).toBe(false);
    expect(baselineBlocked(offer, "2027-06-14")).toBe(0);
    useSession.getState().setRole("admin");
    expect(useSession.getState().role).toBe("client");
    enterMode("demo");
    expect(demoFeature("roleSwitcher")).toBe(true);
    useSession.getState().setRole("admin");
    expect(useSession.getState().role).toBe("admin");
    useModeStore.getState().setMode("live");
  });
});
