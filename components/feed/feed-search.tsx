"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { useCategories, usePricesHidden } from "@/lib/data/views/catalog";
import type { CategoryId } from "@/lib/data/types";
import { useFeedPrefs } from "@/lib/feed-prefs";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface SearchState {
  query: string;
  category: CategoryId | null;
  sort: "rating" | "priceAsc" | "priceDesc";
}

const SORTS = ["rating", "priceAsc", "priceDesc"] as const;

/**
 * A plain search field: tapping it only brings up the keyboard. Categories
 * and sort live behind the separate filter button; every choice applies at once.
 */
export function FeedSearch({
  value,
  onChange,
  onReset,
}: {
  value: SearchState;
  onChange: (patch: Partial<SearchState>) => void;
  onReset: () => void;
}) {
  const { t, l } = useI18n();
  const pricesHidden = usePricesHidden();
  const categories = useCategories();
  const { remember } = useFeedPrefs();
  const [open, setOpen] = useState<"filters" | null>(null);
  const [draft, setDraft] = useState(value.query);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const category = value.category ? categories.find((c) => c.id === value.category) : undefined;
  const active = !!value.query || !!value.category;
  const filtersOn = !!value.category || value.sort !== "rating";

  function close() {
    setOpen(null);
    inputRef.current?.blur();
  }

  function submit() {
    onChange({ query: draft });
    remember(draft);
    close();
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className={cn(
            "flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full bg-foreground/[0.045] pr-1.5 pl-4 transition-shadow",
          )}
        >
          <Search className="size-[18px] shrink-0 text-muted-foreground" strokeWidth={1.5} />
          {category && (
            <span className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-ink pr-1 pl-3 text-xs text-white">
              {l(category.name)}
              <button
                type="button"
                onClick={() => onChange({ category: null })}
                className="flex size-6 items-center justify-center rounded-full hover:bg-white/10"
                aria-label={`${t("feed.reset")}: ${l(category.name)}`}
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            // focusing the field only brings up the keyboard; categories and sort live behind the filter button
            onFocus={() => setOpen(null)}
            placeholder={category ? t("feed.searchShort") : t("feed.search")}
            aria-label={t("feed.searchShort")}
            enterKeyHint="search"
            className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted-foreground md:text-md"
          />
          {active && (
            <button
              type="button"
              onClick={() => {
                setDraft("");
                onReset();
              }}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
              aria-label={t("feed.reset")}
            >
              <X className="size-4" />
            </button>
          )}
        </form>
        <button
          type="button"
          onClick={() => setOpen((o) => (o === "filters" ? null : "filters"))}
          className={cn(
            "relative flex size-12 shrink-0 items-center justify-center rounded-full transition-colors",
            open === "filters" ? "bg-ink text-white" : "bg-foreground/[0.045] text-foreground hover:bg-foreground/[0.08]",
          )}
          aria-label={t("feed.filters")}
          title={t("feed.filters")}
          aria-expanded={open === "filters"}
        >
          <SlidersHorizontal className="size-[18px]" strokeWidth={1.6} />
          {filtersOn && <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-sun" aria-hidden />}
        </button>
      </div>

      {open === "filters" && (
        <div className="absolute inset-x-0 top-[calc(100%+8px)] z-50 flex animate-rise flex-col gap-5 rounded-3xl bg-card p-5 shadow-lift">
          <section>
            <h3 className="text-xs text-muted-foreground">{t("feed.categories")}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {categories.map((c) => {
                const on = value.category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      onChange({ category: on ? null : c.id });
                      setOpen(null);
                    }}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-full px-3.5 text-sm whitespace-nowrap transition-colors",
                      on ? "bg-ink text-white" : "bg-foreground/[0.05] text-text-secondary hover:bg-foreground/[0.09] hover:text-foreground",
                    )}
                  >
                    <CategoryIcon id={c.id} className="size-4" />
                    {l(c.name)}
                  </button>
                );
              })}
            </div>
          </section>
          {!pricesHidden && (
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
          )}
          {filtersOn && (
            <button
              type="button"
              onClick={() => {
                onChange({ category: null, sort: "rating" });
                setOpen(null);
              }}
              className="self-start text-sm text-text-secondary hover:text-foreground"
            >
              {t("feed.reset")}
            </button>
          )}
        </div>
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
        "flex h-9 items-center rounded-full px-4 text-sm whitespace-nowrap transition-colors",
        on ? "bg-ink text-white" : "bg-foreground/[0.05] text-text-secondary hover:bg-foreground/[0.09] hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
