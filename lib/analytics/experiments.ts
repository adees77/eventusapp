"use client";

/**
 * A/B tests. `const v = useVariant("hero_cta", ["control", "short"])` returns one of the variants:
 * - without analytics consent: always the first one (control) and nothing is recorded;
 * - with consent and PostHog configured: the variant of the PostHog feature flag of the same name
 *   (create a multivariate flag / experiment there with the same keys);
 * - with consent but no PostHog: a stable local split by a random visitor id.
 * The first render of a variant sends `experiment_viewed` once per test per visit, so results can be
 * compared by any event (e.g. sign_up_started) in PostHog or any other tool.
 */
import { useEffect, useSyncExternalStore } from "react";
import { track, flagsSnapshot, remoteFlag, subscribeFlags } from "./index";
import { analyticsAllowed, useConsent } from "./consent";

const ANON_KEY = "eventus-anon";
const seen = new Set<string>();

/** FNV-1a: small, fast and stable across browsers */
export function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic bucket of a visitor in a test */
export function pickVariant<V extends string>(visitorId: string, flag: string, variants: readonly V[]): V {
  return variants[hash(`${flag}:${visitorId}`) % variants.length];
}

function visitorId() {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

export function useVariant<V extends string>(flag: string, variants: readonly V[]): V {
  const allowed = useConsent((s) => analyticsAllowed(s.consent));
  useSyncExternalStore(subscribeFlags, flagsSnapshot, flagsSnapshot);

  let variant = variants[0];
  if (allowed) {
    const remote = remoteFlag(flag);
    variant = typeof remote === "string" && (variants as readonly string[]).includes(remote) ? (remote as V) : pickVariant(visitorId(), flag, variants);
  }

  useEffect(() => {
    if (!allowed || seen.has(flag)) return;
    seen.add(flag);
    track("experiment_viewed", { flag, variant });
  }, [allowed, flag, variant]);

  return variant;
}
