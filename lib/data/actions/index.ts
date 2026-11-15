/**
 * All writes go through these modules. Each action checks lib/data/policies.ts
 * before touching the store — the same rules RLS enforces in Supabase.
 * Swap the bodies for supabase-js calls when moving to a real backend.
 */
export * from "./vendors";
export * from "./bookings";
export * from "./notifications";
export * from "./messaging";
export * from "./events";
export * from "./invitations";
export * from "./feed";
export * from "./reviews";
export * from "./admin";
export * from "./account";
export * from "./moderation";
export { asActor, currentActor } from "./_core";
