"use client";

/**
 * Wires product analytics to the app: starts/stops the SDK with the consent, sends a page view per
 * route (path only), ties events to the account after sign-in (id + role, nothing personal) and forgets
 * it after sign-out. Renders nothing. Lives inside AppShell, so the data store is ready.
 */
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { analyticsAllowed, useConsent } from "@/lib/analytics/consent";
import { applyConsent, identify, pageview, register, resetIdentity, track } from "@/lib/analytics";
import { useAuth } from "@/lib/auth/store";
import { useUser } from "@/lib/data/views/users";
import { useIsDemo } from "@/lib/demo/mode";
import { useSession } from "@/lib/session";

/** remembers per tab which account we already reported, so a reload is not a new sign-in */
const SIGNED_KEY = "eventus-analytics-uid";

export function AnalyticsProvider() {
  const pathname = usePathname();
  const allowed = useConsent((s) => analyticsAllowed(s.consent));
  const userId = useAuth((s) => s.userId);
  const role = useSession((s) => s.role);
  const user = useUser(userId);
  const mode = useIsDemo() ? "demo" : "live";
  const prev = useRef<string | null>(null);

  useEffect(() => applyConsent(allowed), [allowed]);

  useEffect(() => {
    if (allowed) register({ mode });
  }, [allowed, mode]);

  useEffect(() => {
    if (allowed) pageview(pathname);
  }, [allowed, pathname]);

  useEffect(() => {
    if (!allowed) return;
    if (userId) {
      identify(userId, { role, mode });
      let reported: string | null = null;
      try {
        reported = sessionStorage.getItem(SIGNED_KEY);
        sessionStorage.setItem(SIGNED_KEY, userId);
      } catch {
        /* private mode: report anyway */
      }
      if (reported !== userId) track("signed_in", { method: user?.authProvider ?? "unknown", role });
    } else if (prev.current) {
      resetIdentity();
      try {
        sessionStorage.removeItem(SIGNED_KEY);
      } catch {
        /* nothing to forget */
      }
    }
    prev.current = userId;
  }, [allowed, userId, role, mode, user?.authProvider]);

  return null;
}
