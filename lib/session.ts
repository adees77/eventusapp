"use client";

/**
 * Demo session: role switcher without passwords.
 * Stored in sessionStorage, so each browser tab can act as a different role
 * (e.g. client in one tab, vendor in another) — handy for live demos.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
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
  setRole: (role: Role, userId?: string) => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      id: DEMO_CLIENT_ID,
      role: "client",
      bound: false,
      setRole: (role, userId) => set({ role, id: userId ?? DEFAULT_USER_BY_ROLE[role], bound: true }),
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
