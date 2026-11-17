"use client";

/**
 * Real accounts through Supabase Auth: a one-time code by email and Google OAuth.
 * Only identity lives here; lib/auth/store.ts turns a signed-in Supabase user into the app's
 * account (live mode). The `profiles` row is created by the on_auth_user_created trigger and is
 * the source of truth for the admin role.
 */
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { routes } from "@/lib/routes";
import { supabase } from "@/lib/supabase/client";

/** Must match Supabase → Authentication → Providers → Email → «Email OTP Length» */
export const LIVE_OTP_LENGTH = Number(process.env.NEXT_PUBLIC_SUPABASE_OTP_LENGTH) || 6;

export interface LiveUser {
  id: string;
  email: string;
  name: string;
  provider: "google" | "email";
  /** profiles.role = 'admin' (set by hand in the database) */
  isAdmin: boolean;
}

export type AuthFailure = "rateLimited" | "invalidEmail" | "providerDisabled" | "network" | "unknown";

export class LiveAuthError extends Error {
  constructor(public reason: AuthFailure, message?: string) {
    super(message ?? reason);
    this.name = "LiveAuthError";
  }
}

function failure(error: { code?: string; status?: number; message?: string }): LiveAuthError {
  const code = error.code ?? "";
  if (code.includes("rate_limit") || error.status === 429) return new LiveAuthError("rateLimited", error.message);
  if (code === "email_address_invalid" || code === "validation_failed") return new LiveAuthError("invalidEmail", error.message);
  if (code === "provider_disabled" || code === "otp_disabled" || /not enabled/i.test(error.message ?? "")) return new LiveAuthError("providerDisabled", error.message);
  if (!error.status) return new LiveAuthError("network", error.message);
  return new LiveAuthError("unknown", error.message);
}

async function toLiveUser(user: SupabaseUser): Promise<LiveUser> {
  const { data: profile } = await supabase().from("profiles").select("name, role").eq("id", user.id).maybeSingle();
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: (user.email ?? "").toLowerCase(),
    name: profile?.name || String(meta.full_name ?? meta.name ?? ""),
    provider: user.app_metadata?.provider === "google" ? "google" : "email",
    isAdmin: profile?.role === "admin",
  };
}

/** Emails a one-time code (creates the account on first sign-in) */
export async function sendEmailCode(email: string): Promise<void> {
  const { error } = await supabase().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw failure(error);
}

/** "wrong" covers both a mistyped and an expired code: Supabase does not tell them apart */
export async function verifyEmailCode(email: string, token: string): Promise<LiveUser | "wrong"> {
  const { data, error } = await supabase().auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    if (error.code === "otp_expired" || error.status === 403 || error.status === 400) return "wrong";
    throw failure(error);
  }
  if (!data.user) return "wrong";
  return toLiveUser(data.user);
}

/** Public Auth settings: which providers are switched on in the dashboard */
async function providerEnabled(provider: "google" | "email"): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (!res.ok) return true; // unknown → let Supabase answer
    const settings = (await res.json()) as { external?: Record<string, boolean> };
    return settings.external?.[provider] !== false;
  } catch {
    throw new LiveAuthError("network");
  }
}

/** Leaves for Google; comes back to /auth/callback (see app/auth/callback) */
export async function startGoogleSignIn(asVendor: boolean): Promise<void> {
  // without this check a disabled provider ends on Supabase's raw JSON error page
  if (!(await providerEnabled("google"))) throw new LiveAuthError("providerDisabled");
  const redirectTo = `${window.location.origin}${routes.authCallback}${asVendor ? "?as=vendor" : ""}`;
  const { error } = await supabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  if (error) throw failure(error);
}

/** The signed-in Supabase user, if any (after an OAuth redirect the client has already exchanged the code) */
export async function currentLiveUser(): Promise<LiveUser | null> {
  const { data } = await supabase().auth.getSession();
  return data.session?.user ? toLiveUser(data.session.user) : null;
}

/**
 * Asks Supabase to move the account to a new address: a confirmation link goes to the new
 * address (with «Secure email change» on, to the current one too); the email changes once confirmed.
 */
export async function requestEmailChange(email: string): Promise<void> {
  const { error } = await supabase().auth.updateUser({ email }, { emailRedirectTo: `${window.location.origin}/auth/callback` });
  if (error) throw failure(error);
}

export async function signOutLive(): Promise<void> {
  await supabase().auth.signOut();
}

/** Calls `onSignedOut` when the Supabase session ends (sign-out in another tab, revoked or expired refresh) */
export function watchLiveSession(onSignedOut: () => void): () => void {
  const { data } = supabase().auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") onSignedOut();
  });
  return () => data.subscription.unsubscribe();
}
