"use client";

import { getDB } from "@/lib/data/store";
import type { Actor } from "@/lib/data/policies";
import type { CategoryId, Locale } from "@/lib/data/types";
import { useChatStore } from "./chat-store";
import type { ChatContentBlock, ChatMessage } from "./protocol";
import type { SearchResult } from "./tool-defs";
import { executeTool } from "./tool-exec";

const FALLBACK: CategoryId[] = ["halls", "hosts", "photo"];
const MAX_CATEGORIES = 3;

export interface OnboardingThreadInput {
  title: string;
  /** the onboarding dialog as it was shown */
  transcript: { from: "bot" | "user"; text: string }[];
  /** what the client pressed on the summary («Всё верно») */
  confirmText: string;
  date?: string;
  city?: string;
  guests?: number;
  priorities?: CategoryId[];
  /** the assistant's lines around the picks, already translated */
  intro: string;
  outro: string;
  none: string;
}

/**
 * The onboarding dialog becomes the client's first assistant thread and ends
 * with picks of vendors free on their date — the conversation goes on from
 * there instead of jumping to the cabinet. Returns the new thread id (opened next).
 */
export function importOnboardingThread(actor: Actor, locale: Locale, input: OnboardingThreadInput): string {
  const messages: ChatMessage[] = [];
  const push = (role: "user" | "assistant", text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const last = messages[messages.length - 1];
    if (last?.role === role && typeof last.content === "string") last.content = `${last.content}\n\n${clean}`;
    else messages.push({ role, content: clean });
  };
  for (const b of input.transcript) push(b.from === "bot" ? "assistant" : "user", b.text);
  push("user", input.confirmText);

  // the same tool the assistant uses, so the picks render as its usual vendor cards
  const db = getDB();
  const cats = [...new Set([...(input.priorities ?? []), ...FALLBACK])].slice(0, MAX_CATEGORIES);
  const uses: ChatContentBlock[] = [];
  const results: ChatContentBlock[] = [];
  cats.forEach((category, i) => {
    const args = {
      category,
      ...(input.city ? { city: input.city } : {}),
      ...(input.date ? { date: input.date } : {}),
      ...(category === "halls" && input.guests ? { guests: input.guests } : {}),
    };
    const out = executeTool("search_vendors", args, db, actor, locale);
    if ("error" in out || !((out as SearchResult).vendors?.length || (out as SearchResult).alternatives?.length)) return;
    const id = `toolu_onb_${i}_${Date.now().toString(36)}`;
    uses.push({ type: "tool_use", id, name: "search_vendors", input: args });
    results.push({ type: "tool_result", tool_use_id: id, content: JSON.stringify(out) });
  });

  if (uses.length) {
    messages.push({ role: "assistant", content: [{ type: "text", text: input.intro }, ...uses] });
    messages.push({ role: "user", content: results });
    messages.push({ role: "assistant", content: input.outro });
  } else {
    push("assistant", input.none);
  }
  return useChatStore.getState().importThread(actor.id, input.title, messages);
}
