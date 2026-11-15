"use client";

/**
 * Which account this tab acts as. The role always comes from the account itself;
 * inside the demo, the role switcher (demoConfig.features.roleSwitcher) can bind the tab to a demo user.
 * Stored in sessionStorage, so each browser tab can act as a different role
 * (e.g. client in one tab, vendor in another) — handy for live demos.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { demoFeature } from "@/lib/demo/mode";
import { useDataStore } from "./data/store";
import { safeStorage } from "./utils";
import type { Actor } from "./data/policies";
import { DEMO_ADMIN_ID, DEMO_CLIENT_ID, demoVendorOwnerId } from "./data/seed";
import type { Role } from "./data/types";

export const DEFAULT_USER_BY_ROLE: Record<Role, string> = {
  client: DEMO_CLIENT_ID,
  vendor: demoVendorOwnerId,
  admin: DEMO_ADMIN_ID,
};

interface SessionState extends Actor {
  /** true once this tab's session was attached to the signed-in account */
  bound: boolean;
  /** Bind the tab to a user. Without `userId` it is the demo switch to that role's demo user. */
  setRole: (role: Role, userId?: string) => void;
  /** Back to the anonymous default (sign-out) */
  reset: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      id: DEMO_CLIENT_ID,
      role: "client",
      bound: false,
      setRole: (role, userId) => {
        // acting as a demo user is a demo-only feature: never reachable with real accounts
        if (!userId && !demoFeature("roleSwitcher")) return;
        const id = userId ?? DEFAULT_USER_BY_ROLE[role];
        // the role is the account's own, as in a Supabase profile — the caller cannot raise it
        const own = useDataStore.getState().db?.users.find((u) => u.id === id)?.role;
        set({ role: own ?? role, id, bound: true });
      },
      reset: () => set({ id: DEMO_CLIENT_ID, role: "client", bound: false }),
    }),
    {
      name: "eventus-session",
      storage: createJSONStorage(() => safeStorage("sessionStorage")),
      partialize: (s) => ({ id: s.id, role: s.role, bound: s.bound }),
    },
  ),
);

export function useActor(): Actor {
  const id = useSession((s) => s.id);
  const role = useSession((s) => s.role);
  return { id, role };
}
