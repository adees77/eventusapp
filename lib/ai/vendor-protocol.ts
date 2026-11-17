/**
 * Wire format of /api/vendor-chat: one answer of a vendor's AI assistant in
 * the client ↔ vendor chat. The browser sends the vendor card (local data
 * stage; with Supabase the server builds it from the database) and the chat
 * history; the server answers with plain JSON.
 */
import { z } from "zod";

const line = z.string().max(600);

export const vendorCardSchema = z.object({
  name: z.string().max(120),
  category: z.string().max(80),
  city: z.string().max(80),
  tagline: line,
  description: z.string().max(2000),
  rating: z.number().min(0).max(5),
  reviewsCount: z.number().int().nonnegative(),
  ordersDone: z.number().int().nonnegative(),
  prepayPercent: z.number().min(0).max(100),
  responseMinutes: z.number().int().nonnegative(),
  verified: z.boolean(),
  facts: z.array(line).max(20),
  offers: z
    .array(
      z.object({
        id: z.string().max(80),
        title: line,
        description: z.string().max(1200),
        price: z.number().nonnegative(),
        unit: z.string().max(60),
        totalUnits: z.number().int().nonnegative(),
        capacity: z.number().int().nonnegative().optional(),
        /** fully booked dates in the next months, YYYY-MM-DD */
        busyDates: z.array(z.string().max(10)).max(120),
      }),
    )
    .max(20),
  reviews: z.array(z.object({ rating: z.number(), text: line })).max(6),
});
export type VendorCard = z.infer<typeof vendorCardSchema>;

export const vendorChatRequestSchema = z
  .object({
    locale: z.enum(["ru", "en"]),
    today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    clientName: z.string().max(80).optional(),
    /** the client's event, when they planned one */
    event: z.object({ title: z.string().max(120), date: z.string().max(10).optional(), guests: z.number().int().nonnegative().max(10000).optional() }).optional(),
    vendor: vendorCardSchema,
    history: z
      .array(z.object({ from: z.enum(["client", "vendor"]), text: z.string().max(4000) }))
      .min(1)
      .max(40),
  })
  .refine((b) => b.history[b.history.length - 1].from === "client", "Last message must be the client's");
export type VendorChatRequest = z.infer<typeof vendorChatRequestSchema>;

export interface VendorChatReply {
  text: string;
  /** services the assistant suggests booking right from the chat */
  offerIds: string[];
  mode: "deepseek" | "claude" | "mock";
}

/** The model marks a booking suggestion with [[book:OFFER_ID]]; we cut the markers out of the text */
export function parseBookingMarkers(raw: string, validIds: string[]): { text: string; offerIds: string[] } {
  const ids: string[] = [];
  const text = raw
    .replace(/\[\[\s*book\s*:\s*([^\]\s]+)\s*\]\]/gi, (_, id: string) => {
      if (validIds.includes(id) && !ids.includes(id)) ids.push(id);
      return "";
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text, offerIds: ids.slice(0, 3) };
}
