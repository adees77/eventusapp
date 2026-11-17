import { beforeEach, describe, expect, it, vi } from "vitest";

// Real accounts on, with Supabase Auth stubbed: the store must behave as with the real backend
vi.mock("@/lib/supabase/client", () => ({ isSupabaseConfigured: () => true, supabase: () => ({}) }));
const live = vi.hoisted(() => ({
  sendEmailCode: vi.fn(async () => {}),
  verifyEmailCode: vi.fn(),
  signOutLive: vi.fn(async () => {}),
  currentLiveUser: vi.fn(),
  watchLiveSession: vi.fn(() => () => {}),
  startGoogleSignIn: vi.fn(),
  LIVE_OTP_LENGTH: 6,
}));
vi.mock("../supabase", () => ({ ...live, LiveAuthError: class extends Error {} }));

import { upsertAuthUser } from "@/lib/data/actions";
import { getDB, useDataStore } from "@/lib/data/store";
import { getMode } from "@/lib/demo/mode";
import { useSession } from "@/lib/session";
import { OTP_MAX_ATTEMPTS } from "../otp";
import { useAuth } from "../store";

const ID = "6f1c2a3e-0000-4000-8000-000000000001";
const liveUser = (over = {}) => ({ id: ID, email: "aigerim@example.kg", name: "Айгерим", provider: "email" as const, isAdmin: false, ...over });

describe("real accounts (Supabase Auth)", () => {
  beforeEach(() => {
    useAuth.getState().signOut();
    vi.clearAllMocks();
  });

  it("an emailed code: no code is kept or shown in the browser", async () => {
    const p = await useAuth.getState().requestEmailCode("  Aigerim@Example.kg ");
    expect(live.sendEmailCode).toHaveBeenCalledWith("aigerim@example.kg");
    expect(p.code).toBe("");
  });

  it("a verified code signs into the live database with the Supabase user id", async () => {
    await useAuth.getState().requestEmailCode("aigerim@example.kg");
    live.verifyEmailCode.mockResolvedValueOnce(liveUser());
    expect(await useAuth.getState().verifyEmailCode("123 456")).toBe("ok");
    expect(live.verifyEmailCode).toHaveBeenCalledWith("aigerim@example.kg", "123456");
    expect(getMode()).toBe("live");
    expect(useAuth.getState().userId).toBe(ID);
    expect(getDB().users.find((u) => u.id === ID)).toMatchObject({ email: "aigerim@example.kg", role: "client", needsOnboarding: true });
    expect(useSession.getState()).toMatchObject({ id: ID, role: "client" });
  });

  it("wrong codes count down and then lock", async () => {
    await useAuth.getState().requestEmailCode("aigerim@example.kg");
    live.verifyEmailCode.mockResolvedValue("wrong");
    for (let i = 1; i < OTP_MAX_ATTEMPTS; i++) expect(await useAuth.getState().verifyEmailCode("000000")).toBe("wrong");
    expect(await useAuth.getState().verifyEmailCode("000000")).toBe("locked");
    expect(await useAuth.getState().verifyEmailCode("000000")).toBe("locked");
    expect(live.verifyEmailCode).toHaveBeenCalledTimes(OTP_MAX_ATTEMPTS);
    expect(useAuth.getState().userId).toBeNull();
  });

  it("signing out ends the Supabase session too", async () => {
    await useAuth.getState().completeLiveSignIn(liveUser());
    useAuth.getState().signOut();
    expect(live.signOutLive).toHaveBeenCalled();
    expect(useAuth.getState().userId).toBeNull();
  });
});

describe("the admin role comes only from the server profile", () => {
  beforeEach(() => useAuth.getState().signOut());

  it("profiles.role = admin makes the account admin and skips onboarding; losing it demotes", async () => {
    await useAuth.getState().completeLiveSignIn(liveUser({ isAdmin: true }));
    expect(getDB().users.find((u) => u.id === ID)).toMatchObject({ role: "admin", needsOnboarding: false });
    expect(useSession.getState().role).toBe("admin");
    await useAuth.getState().completeLiveSignIn(liveUser({ isAdmin: false }));
    expect(getDB().users.find((u) => u.id === ID)?.role).toBe("client");
  });

  it("a vendor stays a vendor when the server says not admin", async () => {
    await useAuth.getState().completeLiveSignIn(liveUser({ id: "vendor-1", email: "v@example.kg" }));
    // became a vendor through the local sign-up (the server profile is not updated until stage 4)
    useDataStore.getState().update((d) => ({ ...d, users: d.users.map((u) => (u.id === "vendor-1" ? { ...u, role: "vendor" as const } : u)) }));
    const u = await upsertAuthUser({ id: "vendor-1", email: "v@example.kg", provider: "email", serverAdmin: false });
    expect(u.role).toBe("vendor");
  });
});

