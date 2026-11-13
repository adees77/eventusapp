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
import { buildSeed, TEST_ACCOUNTS } from "./seed";
import { SEED_SPECS_VERSION } from "./seed/specs";
import type { DB, Transaction } from "./types";

interface DataState {
  db: DB | null;
  hydrated: boolean;
  /** Apply a pure update to the DB */
  update: (fn: (db: DB) => DB) => void;
  resetDemo: () => void;
}

/**
 * True while we apply a snapshot written by another tab: that state is already
 * in localStorage, and writing it back would race with that tab's newer writes
 * (it used to wipe the second half of a multi-step action, e.g. vendor sign-up).
 */
let applyingRemote = false;
/** Fired on window when the DB no longer fits in localStorage */
export const STORAGE_FULL_EVENT = "eventus:storage-full";
const localStore = () => {
  const s = safeStorage("localStorage");
  return {
    getItem: (k: string) => s.getItem(k),
    removeItem: (k: string) => s.removeItem(k),
    setItem: (k: string, v: string) => {
      if (applyingRemote) return;
      try {
        s.setItem(k, v);
      } catch (err) {
        // quota exceeded (photos are data URLs): keep working in memory, tell the UI once, never throw out of update()
        console.warn("[store] could not persist the demo DB", err);
        if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(STORAGE_FULL_EVENT));
      }
    },
  };
};

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
      storage: createJSONStorage(localStore),
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
  // test accounts arrived later: give their demo users an email to sign in with — once, and never one
  // that a real sign-up already uses (that person must keep reaching their own account)
  const emailless = TEST_ACCOUNTS.filter(
    (a) =>
      db.users.some((u) => u.id === a.userId && !u.email) && !db.users.some((u) => u.email?.toLowerCase() === a.email.toLowerCase()),
  );
  if (emailless.length) {
    db = {
      ...db,
      users: db.users.map((u) => {
        const a = emailless.find((x) => x.userId === u.id);
        return a ? { ...u, email: a.email, authProvider: "email" as const } : u;
      }),
    };
  }
  // compare with the constant: building the seed just to read a number ran on every hydration and every tab sync
  if (db.specsVersion !== SEED_SPECS_VERSION) {
    // the details schema grew (prices with periods, menus…): refresh the demo vendors' details, keep everyone else's.
    // Test accounts are real logins whose edits must survive, so they only get details if they have none.
    const byId = new Map(seed().vendors.map((v) => [v.id, v]));
    const testOwners = new Set(TEST_ACCOUNTS.map((a) => a.userId));
    db = {
      ...db,
      specsVersion: SEED_SPECS_VERSION,
      vendors: db.vendors.map((v) => {
        const s = byId.get(v.id);
        if (!s) return v;
        const keep = testOwners.has(v.ownerId) && v.specs && Object.keys(v.specs).length > 0;
        return { ...v, specs: keep ? v.specs : s.specs, ordersBase: v.ordersBase ?? s.ordersBase };
      }),
    };
  }
  if (db.vendors.some((v) => v.ordersBase === undefined)) {
    // vendor details and completed-orders count arrived later: fill them in for the demo vendors
    const byId = new Map(seed().vendors.map((v) => [v.id, v]));
    db = {
      ...db,
      vendors: db.vendors.map((v) =>
        v.ordersBase !== undefined ? v : { ...v, specs: v.specs ?? byId.get(v.id)?.specs, ordersBase: byId.get(v.id)?.ordersBase ?? 0 },
      ),
    };
  }
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
  if (!db.documents || !db.complaints) {
    // verification papers and complaints arrived later: take the demo ones for the vendors that still exist
    const s = seed();
    const has = (id: string) => db.vendors.some((v) => v.id === id);
    const queued = new Map(s.vendors.filter((v) => v.verification).map((v) => [v.id, v.verification]));
    db = {
      ...db,
      documents: db.documents ?? s.documents.filter((d) => has(d.vendorId)),
      complaints: db.complaints ?? s.complaints.filter((c) => has(c.vendorId)),
      vendors: db.vendors.map((v) => (v.verified || v.verification || !queued.has(v.id) ? v : { ...v, verification: queued.get(v.id) })),
    };
  }
  if (!db.settings.requiredDocs) db = { ...db, settings: { ...seed().settings, ...db.settings } };
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

/** Cross-tab sync: another tab wrote to localStorage → take its snapshot here, without writing it back */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== demoConfig.storageKey) return;
    // storage was cleared elsewhere (site data, DevTools): keeping the old DB would resurrect it on our next write
    if (!e.newValue) return window.location.reload();
    let db: DB | undefined;
    try {
      db = (JSON.parse(e.newValue) as { state?: { db?: DB } }).state?.db;
    } catch {
      return;
    }
    if (!db) return;
    // another tab already runs a newer build: reload to get it instead of overwriting its data with our older schema
    if (db.version > demoConfig.seedVersion) return window.location.reload();
    // an older tab still on v1 data — nothing safe to take from it
    if (db.version !== demoConfig.seedVersion && db.version !== 2) return;
    const next = migrate(db);
    // the snapshot is already stored; write only if our migration changed it, so storage matches what we show
    applyingRemote = next === db;
    try {
      useDataStore.setState({ db: next });
    } finally {
      applyingRemote = false;
    }
  });
}
