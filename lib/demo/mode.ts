"use client";

/**
 * Which data the app runs on.
 *
 * - "live": a real account (email / Google sign-up). Its own database: the vendor catalog,
 *   but no made-up clients, bookings or chats, and none of the demo tricks below.
 *   With Supabase this is the real backend.
 * - "demo": entered by the «Посмотреть демо» button. A fully seeded, resettable database,
 *   the role switcher, vendor auto-replies and simulated calendar occupancy.
 *
 * The mode is per browser (like the sign-in) and survives reloads. Everything demo-only
 * asks `isDemoMode()` / `useIsDemo()` — never a build-time flag alone.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { demoConfig } from "@/config/demo";
import { safeStorage } from "@/lib/utils";

export type DataMode = "live" | "demo";

export const MODE_STORAGE_KEY = "eventus-mode";

/** Browsers that were in the demo before modes existed (the old auth kept a `demo` flag) */
function legacyMode(): DataMode {
  try {
    const raw = safeStorage("localStorage").getItem("eventus-auth");
    return raw && JSON.parse(raw)?.state?.demo ? "demo" : "live";
  } catch {
    return "live";
  }
}

interface ModeState {
  mode: DataMode;
  setMode: (mode: DataMode) => void;
}

export const useModeStore = create<ModeState>()(
  persist(
    (set) => ({
      mode: legacyMode(),
      setMode: (mode) => set({ mode: mode === "demo" && !demoConfig.enabled ? "live" : mode }),
    }),
    { name: MODE_STORAGE_KEY, storage: createJSONStorage(() => safeStorage("localStorage")) },
  ),
);

export const getMode = (): DataMode => (demoConfig.enabled ? useModeStore.getState().mode : "live");
export const isDemoMode = () => getMode() === "demo";
export const useIsDemo = () => useModeStore((s) => demoConfig.enabled && s.mode === "demo");

/** A demo-only feature is on: the demo is running and the feature flag allows it */
export const demoFeature = (flag: keyof typeof demoConfig.features) => isDemoMode() && demoConfig.features[flag];
