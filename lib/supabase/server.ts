import "server-only";
/**
 * Supabase on the server (route handlers).
 *  - `userClient(req)`  — acts as the signed-in caller: their access token from `Authorization: Bearer …`,
 *                         every query goes through RLS exactly like in the browser.
 *  - `serviceClient()`  — service_role (SUPABASE_SERVICE_ROLE_KEY): bypasses RLS. Only for webhooks and
 *                         server jobs that are themselves authenticated (provider signature, cron secret).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const NO_SESSION = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

export function bearer(req: Request): string | null {
  const h = req.headers.get("authorization");
  return h?.startsWith("Bearer ") ? h.slice(7).trim() || null : null;
}

export function userClient(req: Request): SupabaseClient<Database> | null {
  const token = bearer(req);
  if (!URL || !KEY || !token) return null;
  return createClient<Database>(URL, KEY, { auth: NO_SESSION, global: { headers: { Authorization: `Bearer ${token}` } } });
}

let service: SupabaseClient<Database> | undefined;

export function isServiceConfigured(): boolean {
  return Boolean(URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function serviceClient(): SupabaseClient<Database> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL || !key) throw new Error("Supabase service role is not configured (SUPABASE_SERVICE_ROLE_KEY)");
  service ??= createClient<Database>(URL, key, { auth: NO_SESSION });
  return service;
}
