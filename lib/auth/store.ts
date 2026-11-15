"use client";

/**
 * Sign-in. Google and email sign-in are imitated in the browser: there is no OAuth
 * round-trip and no email is sent. They open the LIVE database (lib/demo/mode.ts);
 * «Посмотреть демо» and the seeded test accounts open the DEMO database instead.
 * The account is a normal `User` row, so policies, chats and bookings work unchanged.
 * To go live, swap these actions for Supabase Auth (signInWithOAuth / signInWithOtp).
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { upsertAuthUser } from "@/lib/data/actions";
import { getDB } from "@/lib/data/store";
import { DEMO_CLIENT_ID, TEST_ACCOUNTS } from "@/lib/data/seed";
import { enterMode } from "@/lib/demo/switch";
import { useSession } from "@/lib/session";
import { safeStorage } from "@/lib/utils";
import { checkCode, createCode, type PendingCode, type VerifyResult } from "./otp";

interface AuthState {
  /** Signed-in account; null → /welcome */
  userId: string | null;
  pending: PendingCode | null;
  signInWithGoogle: (input: { name: string; email: string }) => void;
  requestEmailCode: (email: string) => PendingCode;
  verifyEmailCode: (code: string) => VerifyResult;
  cancelEmailCode: () => void;
  /** Open the demo, as the demo client or as one of the seeded TEST_ACCOUNTS */
  signInDemo: (userId?: string) => void;
  signOut: () => void;
}

function bindSession(userId: string) {
  const user = getDB().users.find((u) => u.id === userId);
  useSession.getState().setRole(user?.role ?? "client", userId);
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      userId: null,
      pending: null,
      signInWithGoogle: ({ name, email }) => {
        enterMode("live");
        const user = upsertAuthUser({ email, name, provider: "google" });
        set({ userId: user.id, pending: null });
        bindSession(user.id);
      },
      requestEmailCode: (email) => {
        const pending = createCode(email);
        set({ pending });
        return pending;
      },
      verifyEmailCode: (code) => {
        const { pending } = get();
        const res = checkCode(pending, code);
        if (res.result !== "ok") {
          set({ pending: res.pending });
          return res.result;
        }
        enterMode("live");
        const user = upsertAuthUser({ email: pending!.email, provider: "email" });
        set({ userId: user.id, pending: null });
        bindSession(user.id);
        return "ok";
      },
      cancelEmailCode: () => set({ pending: null }),
      signInDemo: (userId = DEMO_CLIENT_ID) => {
        if (userId !== DEMO_CLIENT_ID && !TEST_ACCOUNTS.some((a) => a.userId === userId)) return;
        enterMode("demo");
        if (!getDB().users.some((u) => u.id === userId)) return;
        set({ userId, pending: null });
        bindSession(userId);
      },
      /** Leaving the demo ends in live mode too */
      signOut: () => {
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
