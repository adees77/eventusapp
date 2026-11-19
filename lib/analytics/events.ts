/**
 * Every product event we send, with its properties. This list is the source of truth for analytics
 * and for the privacy policy («what we measure»): add an event here before calling track() with it.
 *
 * Rules: snake_case, past tense; properties describe the action, never the person — no names, emails,
 * phones, message or request text, document data or exact addresses. The person is the PostHog id
 * (our account id after sign-in, a random id before), nothing more.
 */
export type StoryPage = "client" | "vendor";

export interface AnalyticsEvents {
  /** a scroll-story scene came into view (once per scene per visit) */
  story_scene_viewed: { page: StoryPage; scene: number };
  /** the story dock was used instead of scrolling */
  story_dock_used: { page: StoryPage; action: "next" | "prev" | "jump" | "top"; scene: number };
  /** a call to action on a landing was pressed */
  landing_cta_clicked: { page: StoryPage; cta: "client_start" | "vendor_start" | "vendor_info" | "client_info" | "top_start" | "demo" | "guest_feed" | "vendor_demo"; scene: number };
  /** sign-in or sign-up was started on /welcome */
  sign_up_started: { method: "google" | "email" | "demo"; as: "client" | "vendor" };
  /** an account appeared in this tab (fired by the analytics provider) */
  signed_in: { method: string; role: string };
  /** the client sent the assistant a message (its length bucket, never the text) */
  assistant_message_sent: { chars: "short" | "medium" | "long" };
  /** a booking was created (before payment) */
  booking_created: { category: string };
  /** the prepayment for a booking went through */
  prepayment_paid: { category: string };
  /** a new invitation was created */
  invitation_created: { from: "scratch" | "template" };
  /** a vendor published a post */
  post_published: { photos: number };
  /** a visitor saw a variant of an A/B test (sent once per test per visit) */
  experiment_viewed: { flag: string; variant: string };
}

export type AnalyticsEvent = keyof AnalyticsEvents;

/** Message length without the message: buckets are enough to see how people talk to the assistant */
export const charsBucket = (n: number): AnalyticsEvents["assistant_message_sent"]["chars"] => (n < 40 ? "short" : n < 160 ? "medium" : "long");
