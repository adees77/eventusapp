"use client";

import { LogoMark } from "@/components/brand/logo";
import type { ChatContentBlock, ChatMessage } from "@/lib/ai/protocol";
import type { ChatStatus } from "@/lib/ai/use-chat";
import { useI18n } from "@/lib/i18n";
import { RichText } from "./rich-text";
import { ToolResultView } from "./tool-results";

interface ToolPart {
  kind: "tool";
  id: string;
  name: string;
  data: unknown;
}
interface TextPart {
  kind: "text";
  text: string;
}
type Item = { role: "user"; text: string; key: string } | { role: "assistant"; parts: (TextPart | ToolPart)[]; key: string };

/** Turns the raw API transcript into display items (tool results become UI, not text). */
function toItems(messages: ChatMessage[]): Item[] {
  const results = new Map<string, unknown>();
  for (const m of messages) {
    if (m.role !== "user" || !Array.isArray(m.content)) continue;
    for (const b of m.content as ChatContentBlock[]) {
      if (b.type === "tool_result" && typeof b.content === "string") {
        try {
          results.set(b.tool_use_id, JSON.parse(b.content));
        } catch {
          /* ignore */
        }
      }
    }
  }

  const items: Item[] = [];
  messages.forEach((m, i) => {
    if (m.role === "user") {
      if (typeof m.content === "string") items.push({ role: "user", text: m.content, key: `u${i}` });
      return;
    }
    const blocks = (typeof m.content === "string" ? [{ type: "text", text: m.content }] : m.content) as ChatContentBlock[];
    const parts: (TextPart | ToolPart)[] = [];
    for (const b of blocks) {
      if (b.type === "text" && b.text.trim()) parts.push({ kind: "text", text: b.text });
      if (b.type === "tool_use") parts.push({ kind: "tool", id: b.id, name: b.name, data: results.get(b.id) });
    }
    // merge consecutive assistant turns (tool loop) into one visual message
    const prev = items[items.length - 1];
    if (prev && prev.role === "assistant") prev.parts.push(...parts);
    else items.push({ role: "assistant", parts, key: `a${i}` });
  });
  return items;
}

export function MessageList({
  messages,
  live,
  status,
  tool,
  onQuickReply,
}: {
  messages: ChatMessage[];
  live: string;
  status: ChatStatus;
  tool: string | null;
  onQuickReply: (t: string) => void;
}) {
  const { t } = useI18n();
  const items = toItems(messages);
  const lastIsAssistant = items[items.length - 1]?.role === "assistant";
  const pending = status === "thinking" || status === "tool" || status === "streaming";

  return (
    <div className="flex flex-col gap-8">
      {items.map((it, idx) =>
        it.role === "user" ? (
          <div key={it.key} className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-md leading-relaxed whitespace-pre-wrap text-secondary-foreground">
              {it.text}
            </div>
          </div>
        ) : (
          <AssistantRow key={it.key} showAvatar>
            {it.parts.map((p, j) =>
              p.kind === "text" ? (
                <div key={j} className="text-md leading-relaxed text-foreground">
                  <RichText text={p.text} />
                </div>
              ) : (
                <ToolResultView key={p.id} name={p.name} data={p.data} onQuickReply={onQuickReply} />
              ),
            )}
            {idx === items.length - 1 && pending && <LiveTail live={live} status={status} tool={tool} />}
          </AssistantRow>
        ),
      )}
      {pending && !lastIsAssistant && (
        <AssistantRow showAvatar>
          <LiveTail live={live} status={status} tool={tool} />
        </AssistantRow>
      )}
      {status === "error" && <p className="pl-11 text-sm text-destructive">{t("chat.error")}</p>}
    </div>
  );
}

function AssistantRow({ children, showAvatar }: { children: React.ReactNode; showAvatar?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-card">
        {showAvatar && <LogoMark className="h-2.5 w-auto" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4 pt-1">{children}</div>
    </div>
  );
}

function LiveTail({ live, status, tool }: { live: string; status: ChatStatus; tool: string | null }) {
  const { t } = useI18n();
  if (live) {
    return (
      <div className="text-md leading-relaxed">
        <RichText text={live} />
      </div>
    );
  }
  const label = status === "tool" ? (tool === "get_vendor" ? t("chat.toolVendor") : t("chat.toolSearch")) : t("chat.thinking");
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1.5 rounded-full bg-primary" style={{ animation: `dots 1.2s ${i * 0.16}s infinite` }} />
        ))}
      </span>
      {label}
    </div>
  );
}
