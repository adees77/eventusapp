"use client";

/**
 * Cookie / analytics consent. Necessary storage (sign-in, language, the app's own data) needs no consent;
 * product analytics runs only after the visitor allows it. The choice lives in localStorage
 * (`eventus-consent`) and is asked again when CONSENT_VERSION grows (new purposes or providers).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

/** bump when the privacy policy adds a purpose or a provider that needs fresh consent */
export const CONSENT_VERSION = 1;

export interface Consent {
  analytics: boolean;
  decidedAt: string;
  version: number;
}

interface ConsentState {
  consent: Consent | null;
  /** the settings panel is open (from the banner or «Cookie settings» in the footer) */
  settingsOpen: boolean;
  decide: (analytics: boolean) => void;
  openSettings: () => void;
  closeSettings: () => void;
}

export const useConsent = create<ConsentState>()(
  persist(
    (set) => ({
      consent: null,
      settingsOpen: false,
      decide: (analytics) => set({ consent: { analytics, decidedAt: new Date().toISOString(), version: CONSENT_VERSION }, settingsOpen: false }),
      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),
    }),
    { name: "eventus-consent", partialize: (s) => ({ consent: s.consent }) },
  ),
);

/** A current decision exists (an outdated one asks again) */
export const hasDecided = (c: Consent | null) => !!c && c.version === CONSENT_VERSION;
/** Analytics may run right now */
export const analyticsAllowed = (c: Consent | null = useConsent.getState().consent) => hasDecided(c) && c!.analytics;
