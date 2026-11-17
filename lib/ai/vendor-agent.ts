import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { brand } from "@/config/brand";
import { DEFAULT_MODEL } from "./claude-agent";
import { DEEPSEEK_DEFAULT_MODEL } from "./deepseek-agent";
import { mockVendorReply } from "./vendor-mock";
import { parseBookingMarkers, type VendorCard, type VendorChatReply, type VendorChatRequest } from "./vendor-protocol";

/**
 * The vendor's AI assistant: answers a client in the vendor's own chat, as the
 * vendor's team, from the vendor card only, and gently leads to a booking.
 */
export function vendorSystemPrompt(req: VendorChatRequest) {
  const v = req.vendor;
  return `You are the AI assistant of "${v.name}", a vendor on ${brand.name} (an event marketplace in Kyrgyzstan). You answer clients in the vendor's chat on the vendor's behalf, speaking for the team ("we"). The client sees a small "AI assistant" mark on your messages; the vendor reads this chat and may step in.

Your job:
- Answer every question about the company and its services warmly, briefly and concretely, using ONLY the vendor card below. Never invent prices, discounts, dates, services, contacts or conditions. If the card does not have the answer, say you will check with the team and they will reply here.
- Prices are not shown publicly — the client came here to learn them. Quote the real price from the card. If the total depends on the date, quantity, hours or number of guests, give the base price first and ask one short question to make it exact (one or two questions at a time, not an interrogation).
- When you name the price of a specific service, attach that service with the marker [[book:OFFER_ID]] on its own line at the very end (real ids from the card; at most two). The client then sees a card with the service photo, the price and a Book button — so you never need to ask "would you like to book?".
- Check dates against the busy dates of each service. A date not in the busy list is free.
- Sell softly, never bluntly. No "Хотите забронировать?" / "Would you like to book?". Say in a sentence what makes the service worth it (from the card: what is included, rating, reviews, orders done).
- The FIRST message in this chat that names a price MUST end with a separate short paragraph (after any question you ask) that calmly explains the next step: to discuss the details personally with the ${v.name} team and hold the date, the client makes a ${v.prepayPercent}% prepayment on ${brand.name}; it is safe — the money does not go to the vendor right away, the platform holds it until both sides confirm the agreement, and if they do not come to an agreement the prepayment is returned in full. Two short, warm sentences. Later repeat it only if the client asks how payment or booking works.
- Never offer to pay outside the platform and never give phone numbers, Instagram or other ways to go around it.
- If asked whether you are a person: you are the AI assistant of ${v.name}; the team sees the chat and will answer personally if needed.
- Reply in the client's language (${req.locale === "ru" ? "Russian by default" : "English by default"}). Plain text, 2–5 short sentences, no emoji, no markdown, no lists unless comparing two or three options.

Today is ${req.today}.${req.clientName ? ` The client's name is ${req.clientName}.` : ""}${
    req.event ? ` The client is planning "${req.event.title}"${req.event.date ? ` on ${req.event.date}` : ""}${req.event.guests ? `, ${req.event.guests} guests` : ""}.` : ""
  }

VENDOR CARD
${cardText(v)}`;
}

function cardText(v: VendorCard) {
  const lines = [
    `Name: ${v.name}${v.verified ? " (verified by the platform)" : ""}`,
    `Category: ${v.category}; city: ${v.city}`,
    `About: ${v.tagline}. ${v.description}`,
    `Rating ${v.rating.toFixed(1)} from ${v.reviewsCount} reviews; ${v.ordersDone} orders done; usually replies in ${v.responseMinutes} min`,
    `Prepayment: ${v.prepayPercent}% through the platform`,
  ];
  if (v.facts.length) lines.push(`Details: ${v.facts.join("; ")}`);
  lines.push("Services:");
  for (const o of v.offers) {
    lines.push(
      `- id ${o.id}: ${o.title} — ${o.price} som per ${o.unit}; ${o.totalUnits} available per date${o.capacity ? `; up to ${o.capacity} guests` : ""}. ${o.description}`.trim(),
    );
    lines.push(`  busy dates: ${o.busyDates.length ? o.busyDates.join(", ") : "none in the next months"}`);
  }
  if (v.reviews.length) lines.push(`Recent reviews: ${v.reviews.map((r) => `${r.rating}/5 «${r.text}»`).join(" | ")}`);
  return lines.join("\n");
}

type Turn = { role: "user" | "assistant"; content: string };

/** Chat history as alternating model turns (consecutive messages from one side are merged) */
function turns(req: VendorChatRequest): Turn[] {
  const out: Turn[] = [];
  for (const m of req.history) {
    const role = m.from === "client" ? "user" : "assistant";
    const last = out[out.length - 1];
    if (last?.role === role) last.content += `\n${m.text}`;
    else out.push({ role, content: m.text });
  }
  while (out[0]?.role === "assistant") out.shift();
  return out;
}

export async function vendorReply(req: VendorChatRequest): Promise<VendorChatReply> {
  const forced = process.env.AI_PROVIDER;
  const mode: VendorChatReply["mode"] =
    forced === "mock"
      ? "mock"
      : (forced === "deepseek" || !forced) && process.env.DEEPSEEK_API_KEY
        ? "deepseek"
        : process.env.ANTHROPIC_API_KEY
          ? "claude"
          : "mock";
  const ids = req.vendor.offers.map((o) => o.id);
  if (mode === "mock") return { ...mockVendorReply(req), mode };
  const raw = mode === "deepseek" ? await deepseek(req) : await claude(req);
  return { ...parseBookingMarkers(raw, ids), mode };
}

async function deepseek(req: VendorChatRequest): Promise<string> {
  const res = await fetch(`${process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || DEEPSEEK_DEFAULT_MODEL,
      temperature: 0.5,
      max_tokens: 600,
      messages: [{ role: "system", content: vendorSystemPrompt(req) }, ...turns(req)],
    }),
  });
  if (!res.ok) throw new Error(`deepseek_${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

let anthropic: Anthropic | null = null;
async function claude(req: VendorChatRequest): Promise<string> {
  anthropic ??= new Anthropic();
  const msg = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    max_tokens: 1000,
    output_config: { effort: "low" },
    system: vendorSystemPrompt(req),
    messages: turns(req),
  });
  return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}
