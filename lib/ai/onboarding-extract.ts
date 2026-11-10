import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_MODEL } from "./claude-agent";
import { DEEPSEEK_DEFAULT_MODEL } from "./deepseek-agent";

/**
 * Turns one free-text onboarding answer into structured fields.
 * Called only when the local parsers gave up. Returns a plain object;
 * the browser validates it again (lib/onboarding/script.ts → sanitizeAiFields).
 */
const SCHEMA = `{
  "name"?: string,                       // person's name
  "role"?: "client" | "vendor",          // planning an event, or providing services
  "eventType"?: "wedding" | "toi" | "anniversary" | "corporate" | "birthday" | "other",
  "eventTitle"?: string,                 // short title if the event is unusual
  "date"?: "YYYY-MM-DD",                 // future date; month only → a Saturday mid-month
  "city"?: "bishkek" | "osh" | "cholpon-ata",
  "guests"?: number,
  "budget"?: number,                     // KGS (сом); 0 if undecided; convert USD at 87
  "priorities"?: ("halls"|"cars"|"hosts"|"photo"|"decor"|"music"|"cakes"|"beauty"|"attire"|"furniture"|"traditional"|"shows")[],
  "bizName"?: string,
  "category"?: one of the priorities values,
  "phone"?: string,
  "tagline"?: string                     // one sentence about the vendor's service
}`;

function prompt(step: string, text: string, today: string) {
  return [
    "You extract data from a user's reply in the onboarding chat of EVENTUS, an event marketplace in Kyrgyzstan.",
    `Today is ${today}. The assistant just asked about: "${step}".`,
    "Reply with ONLY a JSON object matching this shape; include only fields the user actually stated or clearly implied, never guess:",
    SCHEMA,
    "The reply may be in Russian, Kyrgyz or English, with typos. Numbers may be words.",
    `User reply: """${text.slice(0, 600)}"""`,
  ].join("\n");
}

function parseJson(s: string): unknown {
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

export type ExtractMode = "deepseek" | "claude" | "mock";

export function extractMode(): ExtractMode {
  const forced = process.env.AI_PROVIDER;
  if (forced === "mock") return "mock";
  if ((forced === "deepseek" || !forced) && process.env.DEEPSEEK_API_KEY) return "deepseek";
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  return "mock";
}

export async function extractOnboardingFields(step: string, text: string, today: string, signal?: AbortSignal) {
  const mode = extractMode();
  if (mode === "mock") return { mode, fields: null };

  if (mode === "deepseek") {
    const res = await fetch(`${process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"}/chat/completions`, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || DEEPSEEK_DEFAULT_MODEL,
        temperature: 0,
        max_tokens: 300,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt(step, text, today) }],
      }),
    });
    if (!res.ok) throw new Error(`deepseek ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { mode, fields: parseJson(data.choices?.[0]?.message?.content ?? "") };
  }

  const client = new Anthropic();
  const msg = await client.messages.create(
    {
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 300,
      messages: [{ role: "user", content: prompt(step, text, today) }],
    },
    { signal },
  );
  const out = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return { mode, fields: parseJson(out) };
}
