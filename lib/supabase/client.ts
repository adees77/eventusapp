"use client";

/**
 * The browser Supabase client. Uses the publishable key: it is meant to be public, every row is
 * protected by RLS (supabase/migrations). Server-only keys never go here.
 *
 * Not configured (no env, e.g. in tests) → `isSupabaseConfigured()` is false and live sign-in falls
 * back to the in-browser imitation (lib/auth/store.ts).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = () => !!URL && !!KEY;

let client: SupabaseClient<Database> | null = null;

export function supabase(): SupabaseClient<Database> {
  if (!URL || !KEY) throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)");
  client ??= createClient<Database>(URL, KEY, {
    auth: {
      // OAuth comes back with ?code= that the client exchanges itself (detectSessionInUrl)
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "eventus-supabase-auth",
    },
  });
  return client;
}
