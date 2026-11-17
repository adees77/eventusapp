/**
 * All writes go through these modules. Each action checks lib/data/policies.ts
 * before touching the store — the same rules RLS enforces in Supabase.
 *
 * Contract: every action exported here is async (returns a Promise) and throws on failure
 * (PolicyError, AvailabilityError, Error). UI calls them through `useAction` (lib/data/use-action.ts),
 * which tracks pending state and shows the error. Swap the bodies for supabase-js calls
 * when moving to a real backend — callers don't change.
 *
 * `notify` and `addSystemMessage` are not exported: they are side effects of other actions
 * (triggers / RPC internals in Supabase), never called from the UI.
 */
export * from "./vendors";
export * from "./bookings";
export { markNotificationsRead } from "./notifications";
export { ensureConversation, markRead, postAssistantReply, sendAutoReply, sendMessage } from "./messaging";
export * from "./events";
export * from "./invitations";
export * from "./feed";
export * from "./reviews";
export * from "./admin";
export * from "./account";
export * from "./moderation";
export { asActor, currentActor } from "./_core";
