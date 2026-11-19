import { beforeEach, describe, expect, it } from "vitest";
import { analyticsAllowed, CONSENT_VERSION, hasDecided, useConsent } from "../consent";
import { charsBucket } from "../events";
import { hash, pickVariant } from "../experiments";

describe("consent", () => {
  beforeEach(() => useConsent.setState({ consent: null, settingsOpen: false }));

  it("blocks analytics until the visitor decides", () => {
    expect(hasDecided(useConsent.getState().consent)).toBe(false);
    expect(analyticsAllowed()).toBe(false);
  });

  it("allows analytics only after an explicit yes", () => {
    useConsent.getState().decide(false);
    expect(hasDecided(useConsent.getState().consent)).toBe(true);
    expect(analyticsAllowed()).toBe(false);
    useConsent.getState().decide(true);
    expect(analyticsAllowed()).toBe(true);
  });

  it("asks again when the consent version grows", () => {
    useConsent.setState({ consent: { analytics: true, decidedAt: "2026-01-01", version: CONSENT_VERSION - 1 } });
    expect(hasDecided(useConsent.getState().consent)).toBe(false);
    expect(analyticsAllowed()).toBe(false);
  });
});

describe("experiments", () => {
  it("hashes deterministically", () => {
    expect(hash("abc")).toBe(hash("abc"));
    expect(hash("abc")).not.toBe(hash("abd"));
  });

  it("keeps a visitor in the same variant", () => {
    const v = pickVariant("visitor-1", "hero_cta", ["a", "b"] as const);
    for (let i = 0; i < 5; i++) expect(pickVariant("visitor-1", "hero_cta", ["a", "b"] as const)).toBe(v);
  });

  it("splits visitors roughly evenly", () => {
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 2000; i++) counts[pickVariant(`v${i}`, "hero_cta", ["a", "b"] as const)]++;
    expect(counts.a).toBeGreaterThan(850);
    expect(counts.b).toBeGreaterThan(850);
  });
});

describe("events", () => {
  it("buckets message length without the text", () => {
    expect(charsBucket(10)).toBe("short");
    expect(charsBucket(100)).toBe("medium");
    expect(charsBucket(400)).toBe("long");
  });
});
