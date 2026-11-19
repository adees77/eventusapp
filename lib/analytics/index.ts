"use client";

/**
 * Product analytics (PostHog, EU cloud). Nothing is loaded or sent until the visitor allows analytics
 * in the cookie banner AND `NEXT_PUBLIC_POSTHOG_KEY` is set; without either, every call is a no-op.
 * The SDK is imported lazily, so visitors who decline never download it.
 *
 * Use: `track("booking_created", { category })` with an event from events.ts; page views, sign-in and
 * sign-out are handled by components/analytics/analytics-provider.tsx. A/B tests: experiments.ts.
 * Debug: `NEXT_PUBLIC_ANALYTICS_DEBUG=1` logs every call to the console (also without a key).
 */
import type { PostHog } from "posthog-js";
import { analyticsAllowed } from "./consent";
import type { AnalyticsEvent, AnalyticsEvents } from "./events";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";
const DEBUG = process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "1";

let client: PostHog | null = null;
let loading: Promise<PostHog | null> | null = null;
const queue: ((p: PostHog) => void)[] = [];
const flagListeners = new Set<() => void>();
let flagsVersion = 0;

export const analyticsConfigured = () => !!KEY;

function load(): Promise<PostHog | null> {
  if (client) return Promise.resolve(client);
  if (!KEY || typeof window === "undefined") return Promise.resolve(null);
  loading ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(KEY, {
      api_host: HOST,
      person_profiles: "identified_only",
      // the app is a SPA: the provider sends page views on route changes (path only, no query string)
      capture_pageview: false,
      capture_pageleave: true,
      // clicks on links and buttons, so we can see where people press; never input values
      autocapture: { dom_event_allowlist: ["click", "submit"], element_allowlist: ["a", "button", "form"] },
      disable_session_recording: true,
      respect_dnt: true,
      persistence: "localStorage+cookie",
      sanitize_properties: (props) => {
        // URLs may carry an assistant request (?q=) or a chat draft (?draft=): keep the path only
        for (const k of ["$current_url", "$referrer", "$initial_current_url"]) {
          if (typeof props[k] === "string") props[k] = stripQuery(props[k] as string);
        }
        return props;
      },
    });
    posthog.onFeatureFlags(() => {
      flagsVersion++;
      flagListeners.forEach((l) => l());
    });
    client = posthog;
    queue.splice(0).forEach((fn) => fn(posthog));
    return posthog;
  });
  return loading;
}

function stripQuery(url: string) {
  const i = url.search(/[?#]/);
  return i < 0 ? url : url.slice(0, i);
}

/** Runs fn on the SDK when analytics is allowed; queues it while the SDK loads */
function withClient(fn: (p: PostHog) => void) {
  if (!analyticsAllowed()) return;
  if (client) return fn(client);
  if (!KEY) return;
  queue.push(fn);
  void load();
}

export function track<E extends AnalyticsEvent>(event: E, props: AnalyticsEvents[E]) {
  if (DEBUG) console.info("[analytics]", event, props, analyticsAllowed() ? "" : "(not sent: no consent)");
  withClient((p) => p.capture(event, props as Record<string, unknown>));
}

export function pageview(path: string) {
  if (DEBUG) console.info("[analytics] pageview", path);
  withClient((p) => p.capture("$pageview", { $current_url: window.location.origin + stripQuery(path) }));
}

/** Ties events to the account: our id and role only, never the name, email or phone */
export function identify(userId: string, traits: { role: string; mode: string }) {
  withClient((p) => p.identify(userId, traits));
}

/** Properties sent with every event (e.g. data mode: demo sessions are filtered out in reports) */
export function register(props: Record<string, string | boolean>) {
  withClient((p) => p.register(props));
}

/** Sign-out: the next visitor in this browser starts anonymous */
export function resetIdentity() {
  client?.reset();
}

/** Called when the consent changes: start, or stop and forget the anonymous id */
export function applyConsent(allowed: boolean) {
  if (allowed) {
    void load().then((p) => p?.opt_in_capturing());
  } else if (client) {
    client.opt_out_capturing();
    client.reset();
  }
}

/* feature flags for experiments.ts */
export function remoteFlag(flag: string): string | boolean | undefined {
  return client && analyticsAllowed() ? client.getFeatureFlag(flag) : undefined;
}
export function subscribeFlags(cb: () => void) {
  flagListeners.add(cb);
  return () => {
    flagListeners.delete(cb);
  };
}
export const flagsSnapshot = () => flagsVersion;
