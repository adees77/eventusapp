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
import { designFromLegacy } from "@/lib/invitations/design";
import { buildSeed } from "./seed";
import type { DB, Transaction } from "./types";

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
        // v2 → v3 is additive: upgrade in place so sign-ups and edits survive
        const v = state?.db?.version;
        const stale = !state?.db || (v !== demoConfig.seedVersion && v !== 2);
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
export function migrate(input: DB): DB {
  let db = input;
  let cached: DB | undefined;
  const seed = () => (cached ??= buildSeed());
  if (!db.invitations) {
    // keep the demo invitation, re-pinned to the user's (possibly edited) wedding date
    const invitations = seed().invitations.flatMap((inv) => {
      const ev = db.events.find((e) => e.id === inv.eventId);
      return ev ? [{ ...inv, date: ev.date }] : [];
    });
    db = { ...db, invitations };
  }
  if (db.version === 2 || !db.posts) {
    const s = seed();
    db = {
      ...db,
      version: demoConfig.seedVersion,
      posts: db.posts ?? s.posts.filter((p) => db.vendors.some((v) => v.id === p.vendorId)),
      likes: db.likes ?? [],
      saved: db.saved ?? [],
      follows: db.follows ?? s.follows,
      notifications: db.notifications ?? [],
      settings: db.settings ?? s.settings,
      transactions: db.transactions ?? [],
      bookings: db.bookings.map((b) =>
        b.escrow || b.status === "pending" || b.status === "cancelled"
          ? b
          : {
              ...b,
              escrow:
                b.status === "prepaid"
                  ? { state: "held", amount: b.prepayAmount, heldAt: b.createdAt }
                  : {
                      state: "released",
                      amount: b.prepayAmount,
                      heldAt: b.createdAt,
                      releasedAt: b.createdAt,
                      clientConfirmedAt: b.createdAt,
                      vendorConfirmedAt: b.createdAt,
                    },
            },
      ),
      invitations: db.invitations.map((inv) => ({
        ...inv,
        design: inv.design ?? designFromLegacy(inv),
        guests: inv.guests ?? [],
        views: inv.views ?? [],
      })),
    };
    if (!input.transactions) db = { ...db, transactions: ledgerFromEscrow(db) };
  }
  if (!db.comments) {
    db = { ...db, comments: seed().comments.filter((c) => db.posts.some((p) => p.id === c.postId)) };
  }
  return db;
}

/** Rebuilds the money ledger for bookings that were paid before the ledger existed */
function ledgerFromEscrow(db: DB): Transaction[] {
  const fee = db.settings.feePercent;
  return db.bookings.flatMap((b) => {
    const e = b.escrow;
    if (!e) return [];
    const base = { bookingId: b.id, vendorId: b.vendorId, clientId: b.clientId };
    const out: Transaction[] = [{ ...base, id: `tx-${b.id}-hold`, kind: "hold", amount: e.amount, createdAt: e.heldAt ?? b.createdAt }];
    if (e.state === "released") {
      const f = Math.round((e.amount * fee) / 100);
      out.push({ ...base, id: `tx-${b.id}-release`, kind: "release", amount: e.amount - f, createdAt: e.releasedAt ?? b.createdAt });
      out.push({ ...base, id: `tx-${b.id}-fee`, kind: "fee", amount: f, createdAt: e.releasedAt ?? b.createdAt });
    }
    return out;
  });
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
