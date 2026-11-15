"use client";

/** Shared helpers for the action modules (ids, timestamps, the store writer, the acting user). */
import { useSession } from "@/lib/session";
import type { Actor } from "../policies";
import { useDataStore } from "../store";

export const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const now = () => new Date().toISOString();
export const update = useDataStore.getState().update;

let override: Actor | null = null;

/**
 * Who performs the action. Actions never take the user as a parameter: in the demo it is
 * this tab's session, with Supabase it is `auth.uid()` — the caller cannot pick it.
 */
export function currentActor(): Actor {
  if (override) return override;
  const { id, role } = useSession.getState();
  return { id, role };
}

/** Runs `fn` as another user — for tests and for steps that must act under a fixed role */
export function asActor<T>(actor: Actor, fn: () => T): T {
  const prev = override;
  override = actor;
  try {
    return fn();
  } finally {
    override = prev;
  }
}
