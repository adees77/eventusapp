import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { ChatContext, ChatEvent, ChatMessage } from "./protocol";
import { SYSTEM_PROMPT, contextPrompt } from "./system-prompt";
import { TOOL_DEFINITIONS } from "./tool-defs";

/** Default model; override with ANTHROPIC_MODEL. */
export const DEFAULT_MODEL = "claude-opus-5-5";

let client: Anthropic | null = null;
function getClient() {
  // Reads ANTHROPIC_API_KEY from the server environment — never shipped to the browser
  client ??= new Anthropic();
  return client;
}

/**
 * One model turn, streamed. The browser runs the tools and calls us again
 * with the tool_result appended (manual tool loop), because the demo data
 * lives in the browser.
 */
export async function* streamClaudeTurn(messages: ChatMessage[], ctx: ChatContext): AsyncGenerator<ChatEvent> {
  const stream = getClient().beta.messages.stream({
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    max_tokens: 8000,
    // Chat: low effort keeps replies quick and short
    output_config: { effort: "low" },
    // On a policy decline the API re-runs the request on a fallback model
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      { type: "text", text: contextPrompt(ctx) },
    ],
    tools: TOOL_DEFINITIONS,
    messages,
  });

  try {
    for await (const event of stream) {
      if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
        yield { type: "tool", name: event.content_block.name };
      } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield { type: "text", text: event.delta.text };
      }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") {
      yield {
        type: "done",
        content: final.content.filter((b) => b.type !== "tool_use") as never,
        stop_reason: "refusal",
      };
      return;
    }
    // Pass the full content back unchanged (thinking blocks included) — the
    // client appends it to history verbatim, keeping the conversation append-only.
    yield { type: "done", content: final.content as never, stop_reason: final.stop_reason };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) yield { type: "error", message: "rate_limited" };
    else if (err instanceof Anthropic.AuthenticationError) yield { type: "error", message: "auth" };
    else if (err instanceof Anthropic.APIError) yield { type: "error", message: `api_${err.status ?? "error"}` };
    else throw err;
  }
}
