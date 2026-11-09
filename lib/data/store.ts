"use client";

/**
 * Mock data store (zustand + localStorage).
 *
 * The whole DB snapshot lives in the browser so the demo works without a
 * backend (and on Vercel). Tabs stay in sync through the `storage` event,
 * which gives us "realtime" between a client tab and a vendor tab.
 *
 * To move to Supabase: keep the action signatures, replace bodies with
 * supabase-js calls, and drop the persist middleware.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeStorage } from "@/lib/utils";
import { demoConfig } from "@/config/demo";
import { buildSeed } from "./seed";
import type { DB } from "./types";

interface DataState {
  db: DB | null;
  hydrated: boolean;
  /** Apply a pure update to the DB */
  update: (fn: (db: DB) => DB) => void;
  resetDemo: () => void;
}

export const useDataStore = create<DataState>()(
  persist(
    (set) => ({
      db: null,
      hydrated: false,
      update: (fn) =>
        set((s) => {
          if (!s.db) return s;
          return { db: fn(s.db) };
        }),
      resetDemo: () => set({ db: buildSeed() }),
    }),
    {
      name: demoConfig.storageKey,
      storage: createJSONStorage(() => safeStorage("localStorage")),
      partialize: (s) => ({ db: s.db }),
      onRehydrateStorage: () => (state, error) => {
        const stale = !state?.db || state.db.version !== demoConfig.seedVersion;
        // Sync storage hydrates inside create(), before useDataStore is assigned → defer.
        queueMicrotask(() =>
          useDataStore.setState({
            db: error || stale ? buildSeed() : migrate(state!.db!),
            hydrated: true,
          }),
        );
      },
    },
  ),
);

/** Additive schema changes that don't need a full re-seed (keeps the user's demo data) */
function migrate(db: DB): DB {
  if (db.invitations) return db;
  // keep the demo invitation, re-pinned to the user's (possibly edited) wedding date
  const invitations = buildSeed().invitations.flatMap((inv) => {
    const ev = db.events.find((e) => e.id === inv.eventId);
    return ev ? [{ ...inv, date: ev.date }] : [];
  });
  return { ...db, invitations };
}

/**
 * Read derived data from the DB. Only call inside <AppShell> (db is hydrated).
 * Subscribes to the whole snapshot and derives on render: selectors may freely
 * return new arrays/objects without causing render loops. Fine at demo scale.
 */
export function useDB<T>(selector: (db: DB) => T): T {
  const db = useDataStore((s) => s.db) as DB;
  return selector(db);
}

/** Non-reactive snapshot (for event handlers / tool execution) */
export function getDB(): DB {
  const db = useDataStore.getState().db;
  if (!db) throw new Error("DB not hydrated yet");
  return db;
}

/** Cross-tab sync: another tab wrote to localStorage → rehydrate here */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === demoConfig.storageKey) {
      void useDataStore.persist.rehydrate();
    }
  });
}
