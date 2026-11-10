/**
 * Demo-mode switches. Everything here exists only for the investor demo
 * and should be turned off / removed when real data and payments go live.
 */
export const demoConfig = {
  /** Show the "demo mode" ribbon and fake payment screen */
  enabled: true,
  /** Simulated background occupancy in calendars (see lib/data/availability.ts) */
  baselineOccupancy: true,
  /** Default prepayment percent; each vendor can override in their panel */
  defaultPrepayPercent: 30,
  /** Vendor auto-reply in chat so the demo feels alive when you are alone */
  vendorAutoReply: true,
  /** localStorage key for the mock database; bump suffix to force re-seed */
  storageKey: "eventus-db-v1",
  /** Seed schema version — bump when seed shape changes */
  seedVersion: 3,
} as const;
