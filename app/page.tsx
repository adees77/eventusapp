"use client";

import { format } from "date-fns";
import { PanelLeft, SquarePen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Composer } from "@/components/chat/composer";
import { MessageList } from "@/components/chat/message-list";
import { ThreadList } from "@/components/chat/thread-list";
import { CategoryIcon } from "@/components/category-icon";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useChatStore } from "@/lib/ai/chat-store";
import { useChat } from "@/lib/ai/use-chat";
import { useDB } from "@/lib/data/store";
import type { CategoryId } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";

const SUGGESTIONS: CategoryId[] = ["cars", "halls", "hosts", "decor", "photo"];

export default function AssistantPage() {
  const { t, tn, date } = useI18n();
  const actor = useActor();
  const allThreads = useChatStore((s) => s.threads);
  const removeThread = useChatStore((s) => s.remove);
  const threads = allThreads.filter((th) => th.userId === actor.id);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const thread = threads.find((th) => th.id === threadId) ?? null;
  const { send, stop, status, live, tool, mode, busy } = useChat(thread?.id ?? null, setThreadId);

  const today = format(new Date(), "yyyy-MM-dd");
  const event = useDB((db) =>
    db.events.filter((e) => e.clientId === actor.id && e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = thread?.messages ?? [];
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, live, status]);

  const submit = (text: string) => {
    setInput("");
    void send(text);
  };

  const newChat = () => {
    stop();
    setThreadId(null);
    setInput("");
    setSheetOpen(false);
  };

  const history = (
    <ThreadList
      threads={threads}
      activeId={threadId}
      onSelect={(id) => {
        stop();
        setThreadId(id);
        setSheetOpen(false);
      }}
      onNew={newChat}
      onDelete={(id) => {
        removeThread(id);
        if (id === threadId) setThreadId(null);
      }}
    />
  );

  const empty = messages.length === 0 && !busy;

  return (
    <div className="mx-auto flex h-[calc(100dvh-56px-80px)] w-full max-w-6xl lg:h-[calc(100dvh-64px)]">
      <aside className="hidden w-64 shrink-0 border-r border-border px-3 py-6 lg:block">{history}</aside>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-72 p-4 pt-12">
          <SheetTitle className="sr-only">{t("chat.history")}</SheetTitle>
          {history}
        </SheetContent>
      </Sheet>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center justify-between px-2 lg:hidden">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t("chat.history")}
          >
            <PanelLeft className="size-[18px]" strokeWidth={1.5} />
          </button>
          {!empty && (
            <button
              type="button"
              onClick={newChat}
              className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={t("chat.newChat")}
            >
              <SquarePen className="size-[18px]" strokeWidth={1.5} />
            </button>
          )}
        </div>

        {empty ? (
          <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-8">
            <div className="w-full max-w-2xl animate-rise">
              {event && (
                <p className="text-center text-sm text-muted-foreground tabular-nums">
                  {t("home.eventLine", {
                    title: event.title,
                    date: date(event.date, "d MMMM"),
                    guests: tn("common.guests", event.guests),
                  })}
                </p>
              )}
              <h1 className="mt-3 text-center font-serif text-[2.5rem] leading-[1.08] font-normal tracking-[-0.02em] md:text-6xl">
                {event ? t("home.titleEvent") : t("home.titleEmpty")}
              </h1>
              <p className="mx-auto mt-4 max-w-md text-center text-[15px] leading-relaxed text-text-secondary">{t("home.subtitle")}</p>
              <div className="mt-8">
                <Composer value={input} onChange={setInput} onSubmit={submit} onStop={stop} busy={busy} placeholder={t("chat.placeholder")} autoFocus />
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => submit(t(`chat.suggestionPrompts.${c}` as never))}
                    className="flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-sm text-text-secondary transition-colors hover:border-primary/30 hover:text-foreground"
                  >
                    <CategoryIcon id={c} className="size-4 text-muted-foreground" />
                    {t(`chat.suggestions.${c}` as never)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-8 lg:pt-8">
                <MessageList messages={messages} live={live} status={status} tool={tool} onQuickReply={submit} />
              </div>
            </div>
            <div className="mx-auto w-full max-w-3xl px-4 pb-3">
              <Composer value={input} onChange={setInput} onSubmit={submit} onStop={stop} busy={busy} placeholder={t("chat.placeholderShort")} />
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {mode === "mock" ? t("chat.mockNotice") : t("chat.disclaimer")}
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
