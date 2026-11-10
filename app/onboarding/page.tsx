"use client";

import { format } from "date-fns";
import { ArrowLeft, CalendarDays, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Logo, LogoMark } from "@/components/brand/logo";
import { CategoryIcon } from "@/components/category-icon";
import { Composer } from "@/components/chat/composer";
import { VoiceHero } from "@/components/chat/voice-hero";
import { MonthCalendar } from "@/components/month-calendar";
import { SummaryCard } from "@/components/onboarding/summary-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { completeClientOnboarding, createPost, registerOwnVendor, upsertOffer } from "@/lib/data/actions";
import { CITIES } from "@/lib/data/seed/catalog";
import { useDB } from "@/lib/data/store";
import type { CategoryId } from "@/lib/data/types";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { type Draft, type LogEntry, useOnboardingDraft } from "@/lib/onboarding/draft";
import { dateChip } from "@/lib/onboarding/parse";
import {
  type Answers,
  STEPS,
  type StepId,
  choiceAnswer,
  clearStep,
  currentStep,
  filledSteps,
  mergeAnswers,
  parseAnswer,
  parseStory,
  progress,
  sanitizeAiFields,
  skipAnswer,
} from "@/lib/onboarding/script";
import { useActor, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { eventTitle } from "@/components/onboarding/labels";

type Bubble = { from: "bot"; lines: string[]; key: string } | { from: "user"; text: string; key: string };

const TYPING_MS = 650;
const RETRY_KEYS: Partial<Record<StepId, MessageKey>> = {
  name: "onboarding.retry.name",
  date: "onboarding.retry.date",
  city: "onboarding.retry.city",
  guests: "onboarding.retry.guests",
  budget: "onboarding.retry.budget",
  phone: "onboarding.retry.phone",
  tagline: "onboarding.retry.tagline",
  offerTitle: "onboarding.retry.offerTitle",
  offerPrice: "onboarding.retry.offerPrice",
};

export default function OnboardingPage() {
  const { t, tn, l, date, money, locale, list } = useI18n();
  const router = useRouter();
  const actor = useActor();
  const user = useDB((db) => db.users.find((u) => u.id === actor.id));
  const categories = useDB((db) => db.categories);
  const stored = useOnboardingDraft((s) => s.drafts[actor.id]);
  const saveDraft = useOnboardingDraft((s) => s.set);
  const clearDraft = useOnboardingDraft((s) => s.clear);

  const draft: Draft = stored ?? { answers: user?.name ? { name: user.name } : {}, log: [] };
  const { answers, log, story } = draft;
  // voice-first start: until the user tells their story (or chooses step-by-step)
  const [stepMode, setStepMode] = useState(false);
  const intro = !story && log.length === 0 && !stepMode;
  const step = currentStep(answers);
  const def = STEPS[step];

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState<string | null>(null);
  const [multi, setMulti] = useState<CategoryId[]>([]);
  const [finishing, setFinishing] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const cat = (id: string) => l(categories.find((c) => c.id === id)?.name);
  const question = (s: StepId): string =>
    s === "summary"
      ? t(answers.role === "vendor" ? "onboarding.q.summaryVendor" : "onboarding.q.summaryClient")
      : t(`onboarding.q.${s}` as MessageKey);

  /** What the assistant says right after a reply, before the next question */
  function ackLines(e: LogEntry, a: Answers): string[] {
    if (e.filled.includes("name") && a.name) return [t("onboarding.ack.name", { name: a.name.split(" ")[0] })];
    if (e.filled.includes("role") && a.role) {
      const extra = describe(
        e.filled.filter((f) => f !== "role"),
        a,
      );
      return [t(`onboarding.ack.${a.role}`), ...(extra ? [t("onboarding.ack.noted", { list: extra })] : [])];
    }
    const extra = describe(e.filled.slice(1), a);
    return extra ? [t("onboarding.ack.noted", { list: extra })] : [];
  }

  /** Short human list of extra details picked up from one message */
  function describe(steps: StepId[], a: Answers): string {
    return steps
      .map((s) => {
        if (s === "eventType") return eventTitle(a, t).toLowerCase();
        if (s === "date" && a.date) return date(a.date, "d MMMM yyyy");
        if (s === "city" && a.city) return l(CITIES[a.city]);
        if (s === "guests" && a.guests) return tn("common.guests", a.guests);
        if (s === "budget" && a.budget) return money(a.budget);
        return "";
      })
      .filter(Boolean)
      .join(", ");
  }

  // ── transcript derived from the log ──
  const bubbles = useMemo(() => {
    const out: Bubble[] = [];
    let asked: StepId | null = null;
    let pendingAck: string[] = [];
    // answers as they were after each reply, to phrase acks
    let running: Answers = user?.name ? { name: user.name } : {};
    if (story) {
      out.push({ from: "bot", lines: [t("onboarding.intro.bubble")], key: "hello" });
      out.push({ from: "user", text: story.text, key: "story" });
      running = replay(running, { step: "name", text: story.text, filled: story.filled }, answers);
      const lines: string[] = [];
      if (story.filled.includes("name") && running.name) lines.push(t("onboarding.ack.name", { name: running.name.split(" ")[0] }));
      if (story.filled.includes("role") && running.role === "vendor") lines.push(t("onboarding.ack.vendor"));
      const extra = describe(story.filled, running);
      if (extra) lines.push(t("onboarding.ack.noted", { list: extra }));
      pendingAck = lines.length
        ? step === "summary"
          ? lines
          : [...lines, t("onboarding.ack.storyMore")]
        : [t("onboarding.ack.storyNone")];
    } else {
      const firstStep: StepId = running.name ? "role" : "name";
      const hello = running.name ? t("onboarding.q.helloName", { name: running.name.split(" ")[0] }) : t("onboarding.q.hello");
      out.push({ from: "bot", lines: [hello, question(firstStep)], key: "hello" });
      asked = firstStep;
    }

    log.forEach((e, i) => {
      if (e.step !== asked) {
        out.push({ from: "bot", lines: [...pendingAck, question(e.step)], key: `q${i}` });
        asked = e.step;
      } else if (pendingAck.length) {
        out.push({ from: "bot", lines: pendingAck, key: `a${i}` });
      }
      pendingAck = [];
      out.push({ from: "user", text: e.text, key: `u${i}` });
      if (!e.filled.length) {
        out.push({ from: "bot", lines: [t(RETRY_KEYS[e.step] ?? "onboarding.retry.default")], key: `r${i}` });
        return;
      }
      running = replay(running, e, answers);
      pendingAck = ackLines(e, running);
    });

    if (thinking) {
      out.push({ from: "user", text: thinking, key: "pending" });
    } else {
      // asking again the same step after a successful reply happens after «Изменить» on the summary
      const reask = step !== asked || (log.length > 0 && log[log.length - 1].filled.length > 0);
      if (reask || pendingAck.length)
        out.push({ from: "bot", lines: reask ? [...pendingAck, question(step)] : pendingAck, key: `q-${step}-${log.length}` });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log, answers, step, thinking, locale, story]);

  // typing indicator: reveal each new assistant message after a short pause
  const botCount = bubbles.filter((b) => b.from === "bot").length;
  const [revealed, setRevealed] = useState(() => (stored?.log.length ? botCount : 0));
  // after «Назад» there are fewer messages than revealed; clamp instead of syncing state
  const shown = Math.min(revealed, botCount);
  useEffect(() => {
    if (revealed === botCount) return;
    const id = setTimeout(() => setRevealed(botCount), revealed > botCount ? 0 : TYPING_MS);
    return () => clearTimeout(id);
  }, [botCount, revealed]);
  const typing = shown < botCount || !!thinking;
  let seenBots = 0;
  const visible = bubbles.filter((b) => b.from === "user" || ++seenBots <= shown);
  const ready = !typing;

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [visible.length, typing, step]);

  // ── state updates ──
  function commit(entry: Omit<LogEntry, "filled">, patch: Partial<Answers> | null) {
    const next = patch ? mergeAnswers(answers, patch) : answers;
    const filled = patch ? filledSteps(answers, next) : [];
    saveDraft(actor.id, { ...draft, answers: next, log: [...log, { ...entry, filled }] });
    setMulti([]);
  }

  async function submitStory(raw: string) {
    const text = raw.trim();
    if (!text || thinking) return;
    setInput("");
    setThinking(text);
    const local = parseStory(text);
    let ai: Partial<Answers> = {};
    // the local parser is strict; let the model fill the rest when it's configured
    if (Object.keys(local).length < 5) {
      try {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step: "story", text, today: format(new Date(), "yyyy-MM-dd") }),
        });
        if (res.ok) ai = sanitizeAiFields((await res.json()).fields);
      } catch {
        /* offline: keep what we parsed */
      }
    }
    setThinking(null);
    const base: Answers = user?.name ? { name: user.name } : {};
    const next = mergeAnswers(base, { ...ai, ...local, role: local.role ?? ai.role });
    saveDraft(actor.id, { answers: next, log: [], story: { text, filled: filledSteps(base, next) } });
  }

  async function submitText(raw: string) {
    const text = raw.trim();
    if (intro) return submitStory(text);
    if (!text || !ready || step === "summary") return;
    setInput("");
    const local = parseAnswer(step, text, answers);
    if (local) return commit({ step, text }, local);

    setThinking(text);
    let fields: Partial<Answers> = {};
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, text, today: format(new Date(), "yyyy-MM-dd") }),
      });
      if (res.ok) fields = sanitizeAiFields((await res.json()).fields);
    } catch {
      /* offline → ask again */
    }
    setThinking(null);
    const own = def.field;
    commit({ step, text }, own && fields[own] !== undefined ? fields : null);
  }

  function back() {
    if (!log.length && story && ready) {
      // undo the story → back to the voice start
      clearDraft(actor.id);
      setStepMode(false);
      return;
    }
    if (!log.length && stepMode) return setStepMode(false);
    if (!log.length || !ready) return;
    const last = log[log.length - 1];
    const a: Answers = { ...answers };
    for (const st of last.filled) {
      const f = STEPS[st].field;
      if (f) delete a[f];
      if (st === "eventType") delete a.eventTitle;
    }
    saveDraft(actor.id, { ...draft, answers: a, log: log.slice(0, -1) });
    setMulti([]);
  }

  function edit(s: StepId) {
    saveDraft(actor.id, { ...draft, answers: clearStep(answers, s), log });
  }

  function finish() {
    if (finishing) return;
    setFinishing(true);
    try {
      if (answers.role === "vendor") {
        const vendor = registerOwnVendor(actor, {
          ownerName: answers.name ?? user?.name ?? "",
          name: answers.bizName!,
          category: answers.category!,
          city: answers.city!,
          phone: answers.phone ?? undefined,
          tagline: answers.tagline!,
        });
        const owner = { id: actor.id, role: "vendor" as const };
        // first service and first post, so the profile and the feed are not empty from day one
        const offerId = upsertOffer(owner, {
          vendorId: vendor.id,
          title: { ru: answers.offerTitle!, en: answers.offerTitle! },
          description: { ru: answers.tagline!, en: answers.tagline! },
          price: answers.offerPrice!,
          unit: { ru: "услуга", en: "service" },
          totalUnits: 1,
          photos: vendor.portfolio.slice(0, 2),
          active: true,
        });
        createPost(owner, { vendorId: vendor.id, photos: vendor.portfolio.slice(0, 3), caption: answers.tagline!, offerId });
        useSession.getState().setRole("vendor", actor.id);
        toast.success(t("onboarding.doneVendor"));
        clearDraft(actor.id);
        router.replace("/vendor");
      } else {
        completeClientOnboarding(actor, {
          name: answers.name ?? user?.name ?? "",
          city: answers.city!,
          event: { title: eventTitle(answers, t), date: answers.date!, guests: answers.guests!, budget: answers.budget ?? 0 },
          priorities: answers.priorities ?? [],
        });
        useSession.getState().setRole("client", actor.id);
        toast.success(t("onboarding.doneClient"));
        clearDraft(actor.id);
        router.replace("/dashboard");
      }
    } catch (err) {
      console.error(err);
      toast.error(t("common.error"));
      setFinishing(false);
    }
  }

  // ── chips for the current step ──
  const chipLabel = (s: StepId, v: string) => {
    if (s === "city") return l(CITIES[v]);
    if (s === "category" || s === "priorities") return cat(v);
    return t(`onboarding.options.${s}.${v}` as MessageKey);
  };

  const pct = step === "summary" ? 100 : Math.round(progress(answers) * 100);

  return (
    <div className="flex h-dvh flex-col">
      <header className="shrink-0 border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4">
          <button
            type="button"
            onClick={back}
            disabled={(!log.length && !story && !stepMode) || !ready || finishing}
            aria-label={t("onboarding.back")}
            className="-ml-2 flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-0"
          >
            <ArrowLeft className="size-[18px]" strokeWidth={1.5} />
          </button>
          <Logo className="mx-auto" />
          <span className="w-9 text-right text-xs text-muted-foreground tabular-nums" aria-label={t("onboarding.title")}>
            {pct}%
          </span>
        </div>
        <div
          className="h-px bg-border"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("onboarding.title")}
        >
          <div className="h-px bg-primary transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
        </div>
      </header>

      {intro ? (
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-8">
            <VoiceHero
              title={user?.name ? t("onboarding.intro.titleName", { name: user.name.split(" ")[0] }) : t("onboarding.intro.title")}
              subtitle={t("onboarding.intro.subtitle")}
              examples={list("onboarding.intro.examples")}
              onSend={(text) => void submitStory(text)}
              disabled={!!thinking}
            />
            {thinking ? (
              <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground" aria-live="polite">
                <span className="flex gap-1" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="size-1.5 rounded-full bg-primary" style={{ animation: `dots 1.2s ${i * 0.16}s infinite` }} />
                  ))}
                </span>
                {t("onboarding.thinking")}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setStepMode(true)}
                className="mx-auto mt-6 text-sm text-text-secondary underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                {t("onboarding.intro.stepByStep")}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-6">
            {visible.map((b) =>
              b.from === "user" ? (
                <div key={b.key} className="flex animate-rise justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-md leading-relaxed whitespace-pre-wrap text-secondary-foreground">
                    {b.text}
                  </div>
                </div>
              ) : (
                <BotRow key={b.key}>
                  {b.lines.map((line, i) => (
                    <p key={i} className="text-md leading-relaxed">
                      {line}
                    </p>
                  ))}
                </BotRow>
              ),
            )}
            {typing && (
              <BotRow>
                <span className="flex items-center gap-2 pt-1 text-sm text-muted-foreground" aria-live="polite">
                  <span className="flex gap-1" aria-hidden>
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="size-1.5 rounded-full bg-primary" style={{ animation: `dots 1.2s ${i * 0.16}s infinite` }} />
                    ))}
                  </span>
                  {thinking ? t("onboarding.thinking") : null}
                </span>
              </BotRow>
            )}
            {ready && step === "summary" && (
              <div className="pl-11">
                <SummaryCard answers={answers} onEdit={edit} onConfirm={finish} busy={finishing} />
              </div>
            )}
          </div>
        </div>
      )}

      {(intro || step !== "summary") && (
        <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div
            className={cn("transition-opacity duration-200", intro && "hidden", ready ? "opacity-100" : "pointer-events-none opacity-0")}
          >
            {def.options && def.kind !== "multi" && (
              <div className="flex flex-wrap gap-2 pb-3">
                {def.options.map((v) =>
                  step === "date" ? (
                    <Chip key={v} onClick={() => commit({ step, text: chipLabel(step, v) }, { date: dateChip(v as never) })}>
                      {chipLabel(step, v)}
                    </Chip>
                  ) : (
                    <Chip key={v} onClick={() => commit({ step, text: chipLabel(step, v) }, choiceAnswer(step, v))}>
                      {step === "category" && <CategoryIcon id={v as CategoryId} className="size-4 text-muted-foreground" />}
                      {chipLabel(step, v)}
                    </Chip>
                  ),
                )}
                {step === "date" && (
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger render={<Chip />}>
                      <CalendarDays className="size-4 text-muted-foreground" strokeWidth={1.5} />
                      {t("onboarding.options.date.pick")}
                    </PopoverTrigger>
                    <PopoverContent className="w-[19rem] p-3" align="start" side="top">
                      <MonthCalendar
                        value={null}
                        onChange={(iso) => {
                          setDateOpen(false);
                          if (iso) commit({ step, text: date(iso, "d MMMM yyyy") }, { date: iso });
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            )}
            {def.kind === "multi" && def.options && (
              <div className="pb-3">
                <div className="flex flex-wrap gap-2">
                  {def.options.map((v) => {
                    const on = multi.includes(v as CategoryId);
                    return (
                      <Chip key={v} pressed={on} onClick={() => setMulti((m) => (on ? m.filter((x) => x !== v) : [...m, v as CategoryId]))}>
                        {on ? (
                          <Check className="size-4 text-primary" />
                        ) : (
                          <CategoryIcon id={v as CategoryId} className="size-4 text-muted-foreground" />
                        )}
                        {chipLabel(step, v)}
                      </Chip>
                    );
                  })}
                </div>
                {multi.length > 0 && (
                  <button
                    type="button"
                    onClick={() => commit({ step, text: multi.map(cat).join(", ") }, { priorities: multi })}
                    className="mt-3 h-10 rounded-xl bg-primary px-5 text-sm text-primary-foreground transition-colors hover:bg-primary-hover"
                  >
                    {t("onboarding.continue")} · {multi.length}
                  </button>
                )}
              </div>
            )}
            {def.optional && (
              <button
                type="button"
                onClick={() => commit({ step, text: t("onboarding.skip") }, skipAnswer(step))}
                className="mb-3 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                {t("onboarding.skip")}
              </button>
            )}
          </div>
          <Composer
            value={input}
            onChange={setInput}
            onSubmit={(v) => void submitText(v)}
            onStop={() => {}}
            busy={!!thinking}
            placeholder={intro ? t("onboarding.intro.placeholder") : t("onboarding.placeholder")}
            autoFocus={!intro}
          />
        </div>
      )}
    </div>
  );
}

/** Rebuild answers after one reply from the final answers (so acks read the values that reply set) */
function replay(running: Answers, e: LogEntry, final: Answers): Answers {
  const next = { ...running };
  for (const s of e.filled) {
    const f = STEPS[s].field;
    if (f && final[f] !== undefined) (next as Record<string, unknown>)[f] = final[f];
    if (s === "eventType" && final.eventTitle) next.eventTitle = final.eventTitle;
  }
  return next;
}

function BotRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex animate-rise gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-card">
        <LogoMark className="h-2.5 w-auto" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">{children}</div>
    </div>
  );
}

function Chip({ children, onClick, pressed, ...rest }: React.ComponentProps<"button"> & { pressed?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={cn(
        "flex h-9 items-center gap-2 rounded-lg border px-3 text-sm transition-colors active:translate-y-px",
        pressed
          ? "border-primary/50 bg-secondary text-secondary-foreground"
          : "border-border bg-card text-text-secondary hover:bg-muted hover:text-foreground",
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
