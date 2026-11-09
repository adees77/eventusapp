import "server-only";
import type { ChatContentBlock, ChatContext, ChatEvent, ChatMessage } from "./protocol";
import { SYSTEM_PROMPT, contextPrompt } from "./system-prompt";
import { TOOL_DEFINITIONS } from "./tool-defs";

/**
 * DeepSeek (OpenAI-compatible Chat Completions API).
 * Our transcript is stored in Anthropic block format (text / tool_use /
 * tool_result); here we translate it to OpenAI messages and translate the
 * streamed answer back, so the browser and the tool loop stay unchanged.
 */

const BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
export const DEEPSEEK_DEFAULT_MODEL = "deepseek-chat";

type OAIToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
type OAIMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: OAIToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

const OAI_TOOLS = TOOL_DEFINITIONS.map((t) => ({
  type: "function" as const,
  function: { name: t.name, description: t.description, parameters: t.input_schema },
}));

function toOpenAI(messages: ChatMessage[], ctx: ChatContext): OAIMessage[] {
  const out: OAIMessage[] = [{ role: "system", content: `${SYSTEM_PROMPT}\n\n${contextPrompt(ctx)}` }];
  for (const m of messages) {
    if (typeof m.content === "string") {
      out.push({ role: m.role, content: m.content } as OAIMessage);
      continue;
    }
    const blocks = (m.content ?? []) as ChatContentBlock[];
    if (m.role === "assistant") {
      const text = blocks.map((b) => (b.type === "text" ? b.text : "")).join("");
      const calls: OAIToolCall[] = blocks.flatMap((b) =>
        b.type === "tool_use"
          ? [{ id: b.id, type: "function" as const, function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) } }]
          : [],
      );
      out.push({ role: "assistant", content: text || null, ...(calls.length ? { tool_calls: calls } : {}) });
    } else {
      for (const b of blocks) {
        if (b.type === "tool_result") {
          const content =
            typeof b.content === "string"
              ? b.content
              : (b.content ?? []).map((c) => (c.type === "text" ? c.text : "")).join("");
          out.push({ role: "tool", tool_call_id: b.tool_use_id, content });
        } else if (b.type === "text") {
          out.push({ role: "user", content: b.text });
        }
      }
    }
  }
  return out;
}

export async function* streamDeepSeekTurn(messages: ChatMessage[], ctx: ChatContext): AsyncGenerator<ChatEvent> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Server-only env var — never sent to the browser
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || DEEPSEEK_DEFAULT_MODEL,
      stream: true,
      temperature: 0.4,
      max_tokens: 2000,
      messages: toOpenAI(messages, ctx),
      tools: OAI_TOOLS,
      tool_choice: "auto",
    }),
  });

  if (!res.ok || !res.body) {
    const status = res.status;
    yield { type: "error", message: status === 401 ? "auth" : status === 429 ? "rate_limited" : `api_${status}` };
    return;
  }

  let text = "";
  const calls = new Map<number, { id: string; name: string; args: string }>();
  let finish: string | null = null;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;
      let chunk: {
        choices?: {
          delta?: { content?: string | null; tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[] };
          finish_reason?: string | null;
        }[];
      };
      try {
        chunk = JSON.parse(data);
      } catch {
        continue;
      }
      const choice = chunk.choices?.[0];
      if (!choice) continue;
      const d = choice.delta;
      if (d?.content) {
        text += d.content;
        yield { type: "text", text: d.content };
      }
      for (const tc of d?.tool_calls ?? []) {
        let entry = calls.get(tc.index);
        if (!entry) {
          entry = { id: tc.id ?? `call_${tc.index}`, name: tc.function?.name ?? "", args: "" };
          calls.set(tc.index, entry);
          if (entry.name) yield { type: "tool", name: entry.name };
        }
        if (tc.id) entry.id = tc.id;
        if (tc.function?.name && !entry.name) entry.name = tc.function.name;
        if (tc.function?.arguments) entry.args += tc.function.arguments;
      }
      if (choice.finish_reason) finish = choice.finish_reason;
    }
  }

  const content: ChatContentBlock[] = [];
  if (text.trim()) content.push({ type: "text", text });
  const toolUses = [...calls.values()].filter((c) => c.name);
  // A truncated answer (finish "length") must not run half-parsed tool calls
  const runTools = finish === "tool_calls" && toolUses.length > 0;
  if (runTools) {
    for (const c of toolUses) {
      let input: unknown = {};
      try {
        input = c.args ? JSON.parse(c.args) : {};
      } catch {
        input = { __invalid_json: c.args.slice(0, 200) };
      }
      content.push({ type: "tool_use", id: c.id, name: c.name, input: input as Record<string, unknown> });
    }
  }
  if (!content.length) content.push({ type: "text", text: "…" });
  yield { type: "done", content, stop_reason: runTools ? "tool_use" : finish === "length" ? "max_tokens" : "end_turn" };
}
