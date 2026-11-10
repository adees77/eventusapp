"use client";

import { ArrowLeft, Clock, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CategoryIcon } from "@/components/category-icon";
import { DatePicker } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import { CITIES } from "@/lib/data/seed/catalog";
import { useDB } from "@/lib/data/store";
import type { CategoryId } from "@/lib/data/types";
import { useFeedPrefs } from "@/lib/feed-prefs";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface SearchState {
  query: string;
  category: CategoryId | null;
  city: string | null;
  date: string | null;
  budgetMax: number | null;
  sort: "rating" | "priceAsc" | "priceDesc";
}

const BUDGETS = [50000, 100000, 300000, 1000000];
const SORTS = ["rating", "priceAsc", "priceDesc"] as const;

/**
 * One search field. Filters stay out of sight until the field is focused —
 * then a panel opens with categories, city, date, budget and sort.
 * Active filters show as small tokens inside the field.
 */
export function FeedSearch({
  value,
  onChange,
  onReset,
  count,
}: {
  value: SearchState;
  onChange: (patch: Partial<SearchState>) => void;
  onReset: () => void;
  count: number;
}) {
  const { t, tn, l, money, date } = useI18n();
  const categories = useDB((db) => [...db.categories].sort((a, b) => a.order - b.order));
  const { recent, remember, forget } = useFeedPrefs();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value.query);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // keep the field in sync when the query changes from outside (reset, back button)
  const [seen, setSeen] = useState(value.query);
  if (seen !== value.query) {
    setSeen(value.query);
    setDraft(value.query);
  }

  // debounce typing into the URL
  useEffect(() => {
    if (draft === value.query) return;
    const id = setTimeout(() => onChange({ query: draft }), 220);
    return () => clearTimeout(id);
  }, [draft, value.query, onChange]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      // the date picker renders in a portal: ignore clicks inside popovers
      const target = e.target as HTMLElement;
      if (
        rootRef.current?.contains(target) ||
        sheetRef.current?.contains(target) ||
        target.closest("[data-slot=popover-content],[role=dialog],[data-base-ui-portal]")
      )
        return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // lock page scroll while the mobile panel is open
  useEffect(() => {
    if (!open || window.matchMedia("(min-width: 768px)").matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const tokens: { key: string; label: string; clear: () => void }[] = [];
  if (value.category)
    tokens.push({ key: "c", label: l(categories.find((c) => c.id === value.category)?.name), clear: () => onChange({ category: null }) });
  if (value.city) tokens.push({ key: "city", label: l(CITIES[value.city]), clear: () => onChange({ city: null }) });
  if (value.date) tokens.push({ key: "d", label: date(value.date, "d MMM"), clear: () => onChange({ date: null }) });
  if (value.budgetMax)
    tokens.push({ key: "b", label: t("feed.upTo", { amount: money(value.budgetMax) }), clear: () => onChange({ budgetMax: null }) });
  const active = tokens.length > 0 || !!value.query;

  function submit() {
    onChange({ query: draft });
    remember(draft);
    setOpen(false);
    inputRef.current?.blur();
  }

  const field = (mobile: boolean) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={cn(
        "flex h-12 w-full items-center gap-2 rounded-2xl border bg-card px-3 transition-[border-color,box-shadow]",
        open ? "border-ring ring-3 ring-ring/20" : "border-border shadow-soft hover:border-foreground/15",
      )}
    >
      {mobile ? (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-text-secondary"
          aria-label={t("common.back")}
        >
          <ArrowLeft className="size-4" />
        </button>
      ) : (
        <Search className="size-[18px] shrink-0 text-muted-foreground" strokeWidth={1.5} />
      )}
      <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
        {tokens.map((tk) => (
          <span
            key={tk.key}
            className="flex h-7 shrink-0 items-center gap-1 rounded-lg bg-secondary pr-1 pl-2.5 text-xs text-secondary-foreground"
          >
            {tk.label}
            <button
              type="button"
              onClick={tk.clear}
              className="flex size-5 items-center justify-center rounded-md hover:bg-foreground/5"
              aria-label={`${t("feed.reset")}: ${tk.label}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          ref={mobile ? undefined : inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setOpen(true)}
          autoFocus={mobile}
          placeholder={tokens.length ? t("feed.searchShort") : t("feed.search")}
          aria-label={t("feed.searchShort")}
          enterKeyHint="search"
          className="h-full min-w-24 flex-1 bg-transparent text-md outline-none placeholder:text-muted-foreground"
        />
      </div>
      {active ? (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            onReset();
          }}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={t("feed.reset")}
        >
          <X className="size-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={t("feed.filters")}
          aria-expanded={open}
        >
          <SlidersHorizontal className="size-4" strokeWidth={1.5} />
        </button>
      )}
    </form>
  );

  const panel = (
    <div className="flex flex-col gap-6">
      {recent.length > 0 && !draft && (
        <section>
          <div className="flex items-center justify-between">
            <h3 className="text-xs text-muted-foreground">{t("feed.recent")}</h3>
            <button type="button" onClick={() => forget()} className="text-xs text-muted-foreground hover:text-foreground">
              {t("feed.clearRecent")}
            </button>
          </div>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {recent.map((q) => (
              <li key={q}>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(q);
                    onChange({ query: q });
                    setOpen(false);
                  }}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-sm text-text-secondary hover:bg-muted hover:text-foreground"
                >
                  <Clock className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="text-xs text-muted-foreground">{t("feed.categories")}</h3>
        <ul className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6">
          {categories.map((c) => {
            const on = value.category === c.id;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange({ category: on ? null : c.id })}
                  className={cn(
                    "flex h-[76px] w-full flex-col items-center justify-center gap-1.5 rounded-xl border px-1 text-center text-xs leading-tight transition-colors",
                    on
                      ? "border-primary bg-secondary text-secondary-foreground"
                      : "border-border text-text-secondary hover:bg-muted hover:text-foreground",
                  )}
                >
                  <CategoryIcon id={c.id} className="size-5" />
                  <span className="line-clamp-2">{l(c.name)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-[1fr_1fr_1.4fr]">
        <section>
          <h3 className="text-xs text-muted-foreground">{t("feed.city")}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Choice on={!value.city} onClick={() => onChange({ city: null })}>
              {t("feed.anyCity")}
            </Choice>
            {Object.entries(CITIES).map(([id, name]) => (
              <Choice key={id} on={value.city === id} onClick={() => onChange({ city: value.city === id ? null : id })}>
                {l(name)}
              </Choice>
            ))}
          </div>
        </section>
        <section>
          <h3 className="text-xs text-muted-foreground">{t("feed.date")}</h3>
          <DatePicker
            value={value.date}
            onChange={(d) => onChange({ date: d })}
            className="mt-2 w-full"
            placeholder={t("avail.pickDate")}
          />
        </section>
        <section>
          <h3 className="text-xs text-muted-foreground">{t("feed.budget")}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Choice on={!value.budgetMax} onClick={() => onChange({ budgetMax: null })}>
              {t("feed.anyBudget")}
            </Choice>
            {BUDGETS.map((b) => (
              <Choice key={b} on={value.budgetMax === b} onClick={() => onChange({ budgetMax: value.budgetMax === b ? null : b })}>
                {t("feed.upTo", { amount: money(b) })}
              </Choice>
            ))}
          </div>
        </section>
      </div>

      <section>
        <h3 className="text-xs text-muted-foreground">{t("feed.sort")}</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SORTS.map((s) => (
            <Choice key={s} on={value.sort === s} onClick={() => onChange({ sort: s })}>
              {t(`feed.${s === "rating" ? "sortRating" : s === "priceAsc" ? "sortPriceAsc" : "sortPriceDesc"}`)}
            </Choice>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => {
            setDraft("");
            onReset();
          }}
          className="text-sm text-text-secondary hover:text-foreground disabled:opacity-40"
          disabled={!active && value.sort === "rating"}
        >
          {t("feed.reset")}
        </button>
        <Button className="h-10 px-5" onClick={submit}>
          {t("feed.show")} · {tn("feed.results", count)}
        </Button>
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className="relative">
      {field(false)}
      {open && (
        <>
          {/* desktop: dropdown */}
          <div className="absolute inset-x-0 top-[calc(100%+8px)] z-50 hidden animate-rise rounded-2xl border border-border bg-card p-5 shadow-lift md:block">
            {panel}
          </div>
          {/* mobile: full-screen sheet, portalled — the sticky bar's backdrop-filter would trap a fixed child */}
          {createPortal(
            <div ref={sheetRef} className="fixed inset-0 z-[60] flex flex-col bg-background md:hidden">
              <div className="border-b border-border p-3">{field(true)}</div>
              <div className="flex-1 overflow-y-auto p-4 pb-10">{panel}</div>
            </div>,
            document.body,
          )}
        </>
      )}
    </div>
  );
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "flex h-8 items-center rounded-lg border px-3 text-sm whitespace-nowrap transition-colors",
        on
          ? "border-primary bg-secondary text-secondary-foreground"
          : "border-border text-text-secondary hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
