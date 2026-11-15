/**
 * The demo: a seeded sandbox anyone can open with «Посмотреть демо» (see lib/demo/mode.ts).
 * Real accounts never see these features; the demo itself can be switched off entirely.
 */
export const demoConfig = {
  /** Offer the demo at all (button on the landing and /welcome). Off → everyone is in live mode. */
  enabled: true,
  /** What runs inside the demo */
  features: {
    /** «Демо: войти как» in the account menu — act as the demo client / vendor / admin */
    roleSwitcher: true,
    /** The vendor answers in chat on its own, so a solo presenter sees a live conversation */
    vendorAutoReply: true,
    /** Simulated background occupancy in calendars (lib/data/availability.ts) */
    baselineOccupancy: true,
    /** «Сбросить демо» in the account menu */
    reset: true,
  },
} as const;
