"use client";

/**
 * Sign-in.
 *
 * - Live mode, Supabase configured (NEXT_PUBLIC_SUPABASE_*): real accounts — a one-time code by email
 *   and Google OAuth through Supabase Auth (lib/auth/supabase.ts). The app account keeps the Supabase
 *   user id; the admin role comes from `profiles.role` on the server.
 * - Live mode without Supabase (tests, a checkout without keys): the same flows imitated in the browser —
 *   no email is sent, the code is shown on screen.
 * - «Посмотреть демо» and the seeded test accounts open the DEMO database instead (lib/demo/mode.ts).
 *
 * Data still lives in the local store per mode until stage 4 moves it to Supabase.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { syncAccountWithServer, updateEmail, upsertAuthUser } from "@/lib/data/actions";
import { getDB } from "@/lib/data/store";
import { DEMO_CLIENT_ID, TEST_ACCOUNTS } from "@/lib/data/seed";
import { getMode } from "@/lib/demo/mode";
import { enterMode } from "@/lib/demo/switch";
import { useSession } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { safeStorage } from "@/lib/utils";
import { OTP_LENGTH, OTP_MAX_ATTEMPTS, OTP_TTL_MS, checkCode, createCode, type PendingCode, type VerifyResult } from "./otp";
import * as live from "./supabase";

/** The account behind the password-protected admin entrance; it has no Supabase session (until stage 4) */
export const PANEL_ADMIN_ID = "u-admin-panel";
const PANEL_ADMIN_EMAIL = "admin-panel@eventusai.app";

/** Real Supabase accounts are in use (otherwise live sign-in is imitated in the browser) */
export const realAccounts = () => isSupabaseConfigured();

/** Digits in the email code: Supabase's setting for real accounts, ours for the imitation */
export const codeLength = () => (realAccounts() ? live.LIVE_OTP_LENGTH : OTP_LENGTH);

interface AuthState {
  /** Signed-in account; null → /welcome */
  userId: string | null;
  /** An email code was requested; `code` is filled only in the imitation (shown on screen) */
  pending: PendingCode | null;
  requestEmailCode: (email: string) => Promise<PendingCode>;
  verifyEmailCode: (code: string) => Promise<VerifyResult>;
  cancelEmailCode: () => void;
  /** Real accounts: leaves for Google and comes back to /auth/callback */
  startGoogleSignIn: (opts: { asVendor: boolean }) => Promise<void>;
  /** Imitation only: the «Google» form with a name and an email */
  signInWithGoogle: (input: { name: string; email: string }) => Promise<void>;
  /** A verified Supabase user becomes the app account (email code, OAuth callback, session restore) */
  completeLiveSignIn: (user: live.LiveUser) => Promise<void>;
  /** Open the demo, as the demo client or as one of the seeded TEST_ACCOUNTS */
  signInDemo: (userId?: string) => void;
  signOut: () => void;
  /** The hidden admin entrance (/admin/admin): the server checked the password, open the admin panel */
  signInAdminPanel: () => Promise<void>;
  /** Real accounts: a confirmation link is emailed ("sent"); the imitation changes it at once ("done") */
  changeEmail: (email: string) => Promise<"sent" | "done">;
}

function bindSession(userId: string) {
  const user = getDB().users.find((u) => u.id === userId);
  useSession.getState().setRole(user?.role ?? "client", userId);
}

/** Ends the Supabase session too; never blocks the local sign-out */
function endLiveSession() {
  if (realAccounts()) live.signOutLive().catch((e) => console.warn("[auth] sign-out", e));
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      userId: null,
      pending: null,

      requestEmailCode: async (rawEmail) => {
        const email = rawEmail.trim().toLowerCase();
        if (!realAccounts()) {
          const pending = createCode(email);
          set({ pending });
          return pending;
        }
        await live.sendEmailCode(email);
        const now = Date.now();
        const pending: PendingCode = { email, code: "", sentAt: now, expiresAt: now + OTP_TTL_MS, attempts: 0 };
        set({ pending });
        return pending;
      },

      verifyEmailCode: async (code) => {
        const { pending } = get();
        if (!realAccounts()) {
          const res = checkCode(pending, code);
          if (res.result !== "ok") {
            set({ pending: res.pending });
            return res.result;
          }
          enterMode("live");
          const user = await upsertAuthUser({ email: pending!.email, provider: "email" });
          set({ userId: user.id, pending: null });
          bindSession(user.id);
          return "ok";
        }
        if (!pending) return "none";
        if (pending.attempts >= OTP_MAX_ATTEMPTS) return "locked";
        const res = await live.verifyEmailCode(pending.email, code.replace(/\D/g, ""));
        if (res === "wrong") {
          const next = { ...pending, attempts: pending.attempts + 1 };
          set({ pending: next });
          return next.attempts >= OTP_MAX_ATTEMPTS ? "locked" : "wrong";
        }
        await get().completeLiveSignIn(res);
        return "ok";
      },

      cancelEmailCode: () => set({ pending: null }),

      startGoogleSignIn: ({ asVendor }) => live.startGoogleSignIn(asVendor),

      signInWithGoogle: async ({ name, email }) => {
        enterMode("live");
        const user = await upsertAuthUser({ email, name, provider: "google" });
        set({ userId: user.id, pending: null });
        bindSession(user.id);
      },

      completeLiveSignIn: async (u) => {
        enterMode("live");
        const user = await upsertAuthUser({ id: u.id, email: u.email, name: u.name, provider: u.provider, serverAdmin: u.isAdmin });
        // a returning account set up on another device is restored here instead of going through onboarding again
        await syncAccountWithServer(user.id);
        set({ userId: user.id, pending: null });
        bindSession(user.id);
      },

      signInDemo: (userId = DEMO_CLIENT_ID) => {
        if (userId !== DEMO_CLIENT_ID && !TEST_ACCOUNTS.some((a) => a.userId === userId)) return;
        endLiveSession();
        enterMode("demo");
        if (!getDB().users.some((u) => u.id === userId)) return;
        set({ userId, pending: null });
        bindSession(userId);
      },

      changeEmail: async (raw) => {
        const email = raw.trim().toLowerCase();
        if (realAccounts() && getMode() === "live") {
          await live.requestEmailChange(email);
          return "sent";
        }
        await updateEmail(email);
        return "done";
      },

      /** Leaving the demo ends in live mode too */
      signInAdminPanel: async () => {
        enterMode("live");
        const user = await upsertAuthUser({ id: PANEL_ADMIN_ID, email: PANEL_ADMIN_EMAIL, name: "Admin", provider: "email", serverAdmin: true });
        set({ userId: user.id, pending: null });
        bindSession(user.id);
      },

      signOut: () => {
        if (getMode() === "live") endLiveSession();
        set({ userId: null, pending: null });
        useSession.getState().reset();
        enterMode("live");
      },
    }),
    {
      name: "eventus-auth",
      storage: createJSONStorage(() => safeStorage("localStorage")),
      partialize: (s) => ({ userId: s.userId, pending: s.pending }),
    },
  ),
);

/** A new tab starts with an empty sessionStorage → attach it to the signed-in account */
export function ensureSessionBound() {
  const { userId } = useAuth.getState();
  const session = useSession.getState();
  if (!userId || session.bound) return;
  bindSession(userId);
}

/**
 * Keeps a live account in step with its Supabase session: on load, no session → signed out here too;
 * a session → the admin role is refreshed from the profile. Later sign-outs (another tab, expired
 * refresh token) sign out here as well. Returns the unsubscribe function.
 */
export function syncLiveSession(): () => void {
  if (!realAccounts()) return () => {};
  // the password admin has no Supabase session, so the session check must not sign it out
  const isLiveAccount = () => getMode() === "live" && !!useAuth.getState().userId && useAuth.getState().userId !== PANEL_ADMIN_ID;
  if (isLiveAccount()) {
    live
      .currentLiveUser()
      .then((u) => {
        if (!isLiveAccount()) return;
        if (!u || u.id !== useAuth.getState().userId) useAuth.getState().signOut();
        else return useAuth.getState().completeLiveSignIn(u);
      })
      .catch((e) => console.warn("[auth] session check", e));
  }
  return live.watchLiveSession(() => {
    if (isLiveAccount()) useAuth.getState().signOut();
  });
}
