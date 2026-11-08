/**
 * Wire protocol between the chat UI and /api/chat (SSE, one JSON per event).
 * Both the Claude agent and the mock agent emit exactly these events, so the
 * UI cannot tell them apart.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export type ChatMessage = Anthropic.Beta.BetaMessageParam;
export type ChatContentBlock = Anthropic.Beta.BetaContentBlockParam;

export type ChatEvent =
  | { type: "text"; text: string }
  | { type: "tool"; name: string }
  | { type: "done"; content: ChatContentBlock[]; stop_reason: string | null }
  | { type: "error"; message: string };

export const chatContextSchema = z.object({
  locale: z.enum(["ru", "en"]),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  userName: z.string().max(80).optional(),
  event: z
    .object({
      title: z.string().max(120),
      date: z.string().max(10).optional(),
      city: z.string().max(40).optional(),
      guests: z.number().int().nonnegative().max(10000).optional(),
      budget: z.number().int().nonnegative().optional(),
    })
    .optional(),
  /** date picked in the catalog/profile */
  plannerDate: z.string().max(10).nullable().optional(),
});
export type ChatContext = z.infer<typeof chatContextSchema>;

const MAX_BODY_CHARS = 250_000;

export const chatRequestSchema = z
  .object({
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.union([z.string().max(4000), z.array(z.record(z.string(), z.unknown())).max(40)]),
        }),
      )
      .min(1)
      .max(80),
    context: chatContextSchema,
  })
  .refine((b) => JSON.stringify(b.messages).length <= MAX_BODY_CHARS, "Conversation too long")
  .refine((b) => b.messages[0].role === "user", "First message must be from the user");

export type ChatRequest = { messages: ChatMessage[]; context: ChatContext };

export function sse(event: ChatEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}
