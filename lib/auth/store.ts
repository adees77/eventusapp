"use client";

/**
 * Demo authentication. Google and email sign-in are imitated in the browser:
 * there is no OAuth round-trip and no email is sent. The account itself is a
 * normal `User` row in the mock DB, so the rest of the app (policies, chats,
 * bookings) works unchanged. To go live, swap these actions for Supabase Auth
 * (signInWithOAuth / signInWithOtp) and keep the same shape.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { upsertAuthUser } from "@/lib/data/actions";
import { getDB } from "@/lib/data/store";
import { DEMO_CLIENT_ID, TEST_ACCOUNTS } from "@/lib/data/seed";
import { useSession } from "@/lib/session";
import { safeStorage } from "@/lib/utils";
import { checkCode, createCode, type PendingCode, type VerifyResult } from "./otp";

interface AuthState {
  /** Signed-in account; null → /welcome */
  userId: string | null;
  /** Entered through «посмотреть демо» without an account */
  demo: boolean;
  pending: PendingCode | null;
  signInWithGoogle: (input: { name: string; email: string }) => void;
  requestEmailCode: (email: string) => PendingCode;
  verifyEmailCode: (code: string) => VerifyResult;
  cancelEmailCode: () => void;
  signInDemo: () => void;
  /** Quick entry into a seeded test account (see TEST_ACCOUNTS) without the email code */
  signInTestAccount: (userId: string) => void;
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
      demo: false,
      pending: null,
      signInWithGoogle: ({ name, email }) => {
        const user = upsertAuthUser({ email, name, provider: "google" });
        set({ userId: user.id, demo: false, pending: null });
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
        const user = upsertAuthUser({ email: pending!.email, provider: "email" });
        set({ userId: user.id, demo: false, pending: null });
        bindSession(user.id);
        return "ok";
      },
      cancelEmailCode: () => set({ pending: null }),
      signInDemo: () => {
        set({ userId: DEMO_CLIENT_ID, demo: true, pending: null });
        bindSession(DEMO_CLIENT_ID);
      },
      signInTestAccount: (userId) => {
        if (!TEST_ACCOUNTS.some((a) => a.userId === userId) || !getDB().users.some((u) => u.id === userId)) return;
        set({ userId, demo: false, pending: null });
        bindSession(userId);
      },
      signOut: () => {
        set({ userId: null, demo: false, pending: null });
        useSession.getState().setRole("client");
        useSession.setState({ bound: false });
      },
    }),
    {
      name: "eventus-auth",
      storage: createJSONStorage(() => safeStorage("localStorage")),
      partialize: (s) => ({ userId: s.userId, demo: s.demo, pending: s.pending }),
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
