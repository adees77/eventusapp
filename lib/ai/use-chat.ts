"use client";

import { track } from "@/lib/analytics";
import { charsBucket } from "@/lib/analytics/events";
import { format } from "date-fns";
import { useCallback, useRef, useState } from "react";
import { getDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { usePlanner } from "@/lib/planner";
import { useActor } from "@/lib/session";
import { useChatStore } from "./chat-store";
import type { ChatContentBlock, ChatContext, ChatEvent, ChatMessage } from "./protocol";
import { executeTool } from "./tool-exec";

export type ChatStatus = "idle" | "thinking" | "tool" | "streaming" | "error";
const MAX_STEPS = 6;

/** Drives one conversation: streaming, the browser-side tool loop, persistence. */
export function useChat(threadId: string | null, onThreadCreated: (id: string) => void) {
  const { locale } = useI18n();
  const actor = useActor();
  const { create, append } = useChatStore();
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [live, setLive] = useState("");
  const [tool, setTool] = useState<string | null>(null);
  const [mode, setMode] = useState<"claude" | "deepseek" | "mock" | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const buildContext = useCallback((): ChatContext => {
    const db = getDB();
    const user = db.users.find((u) => u.id === actor.id);
    const today = format(new Date(), "yyyy-MM-dd");
    const event = db.events
      .filter((e) => e.clientId === actor.id && e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    return {
      locale,
      today,
      userName: user?.name.split(" ")[0],
      event: event
        ? { title: event.title, date: event.date, city: event.city, guests: event.guests, budget: event.budget }
        : undefined,
      plannerDate: usePlanner.getState().date,
      pricesHidden: !!db.settings.hidePrices,
    };
  }, [actor.id, locale]);

  const send = useCallback(
    async (text: string) => {
      const clean = text.trim().slice(0, 4000);
      if (!clean || status === "thinking" || status === "streaming" || status === "tool") return;

      let id = threadId;
      if (!id) {
        id = create(actor.id, clean);
        onThreadCreated(id);
      }
      append(id, { role: "user", content: clean });
      track("assistant_message_sent", { chars: charsBucket(clean.length) });

      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("thinking");
      setLive("");

      try {
        for (let step = 0; step < MAX_STEPS; step++) {
          const thread = useChatStore.getState().threads.find((t) => t.id === id)!;
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // a thread imported from onboarding opens with the assistant's greeting: the API wants the user first
            body: JSON.stringify({ messages: fromFirstUser(thread.messages), context: buildContext() }),
            signal: controller.signal,
          });
          const m = res.headers.get("X-Eventus-Mode");
          setMode(m === "claude" || m === "deepseek" ? m : "mock");
          if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

          const done = await readStream(res.body, (e) => {
            if (e.type === "text") {
              setStatus("streaming");
              setLive((s) => s + e.text);
            } else if (e.type === "tool") {
              setStatus("tool");
              setTool(e.name);
            } else if (e.type === "error") {
              throw new Error(e.message);
            }
          });
          if (!done) throw new Error("stream ended early");

          append(id, { role: "assistant", content: done.content });
          setLive("");

          const toolUses = done.content.filter((b) => b.type === "tool_use");
          // Never run tools from a truncated or refused turn
          if (done.stop_reason !== "tool_use" || !toolUses.length) break;

          setStatus("tool");
          const db = getDB();
          const results: ChatContentBlock[] = toolUses.map((b) => {
            if (b.type !== "tool_use") throw new Error("unreachable");
            const out = executeTool(b.name, b.input, db, actor, locale);
            return {
              type: "tool_result",
              tool_use_id: b.id,
              content: JSON.stringify(out),
              ...("error" in out ? { is_error: true } : {}),
            };
          });
          // All results for one turn go back in a single user message
          append(id, { role: "user", content: results });
          await new Promise((r) => setTimeout(r, 250));
          setStatus("thinking");
        }
        setStatus("idle");
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setStatus("idle");
        } else {
          console.error(err);
          setStatus("error");
        }
        setLive("");
      } finally {
        setTool(null);
        abortRef.current = null;
      }
    },
    [actor, append, buildContext, create, locale, onThreadCreated, status, threadId],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  return { send, stop, status, live, tool, mode, busy: status === "thinking" || status === "streaming" || status === "tool" };
}

/** Drops leading assistant turns and keeps the last 80 messages, cut at a plain user message */
function fromFirstUser(messages: ChatMessage[]): ChatMessage[] {
  let start = Math.max(0, messages.length - 80);
  while (start < messages.length && !(messages[start].role === "user" && typeof messages[start].content === "string")) start++;
  return messages.slice(start);
}

async function readStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (e: ChatEvent) => void,
): Promise<Extract<ChatEvent, { type: "done" }> | null> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done: Extract<ChatEvent, { type: "done" }> | null = null;
  for (;;) {
    const { value, done: end } = await reader.read();
    if (end) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 2);
      if (!chunk.startsWith("data:")) continue;
      const event = JSON.parse(chunk.slice(5)) as ChatEvent;
      if (event.type === "done") done = event;
      else onEvent(event);
    }
  }
  return done;
}
