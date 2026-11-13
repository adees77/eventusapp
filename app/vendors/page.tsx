"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FeedSearch, type SearchState } from "@/components/feed/feed-search";
import { Masonry, PostCard } from "@/components/feed/post-card";
import { PostDialog } from "@/components/feed/post-dialog";
import { Button } from "@/components/ui/button";
import { searchPosts } from "@/lib/data/feed";
import { useDB } from "@/lib/data/store";
import type { CategoryId } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { usePlanner } from "@/lib/planner";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

const PAGE = 30;

export default function FeedPage() {
  return (
    <Suspense>
      <Feed />
    </Suspense>
  );
}

function Feed() {
  const { t, date: fmt } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const actor = useActor();
  const planner = usePlanner();

  const tab = params.get("tab") === "top" ? "top" : "foryou";
  const state: SearchState = {
    query: params.get("q") ?? "",
    category: (params.get("category") as CategoryId | null) ?? null,
    city: params.get("city"),
    date: planner.date,
    budgetMax: params.get("budget") ? Number(params.get("budget")) : null,
    sort: (params.get("sort") as SearchState["sort"]) ?? "rating",
  };
  const postId = params.get("post");

  const items = useDB((db) =>
    searchPosts(
      db,
      {
        tab,
        query: state.query,
        category: state.category,
        city: state.city,
        date: state.date,
        budgetMax: state.budgetMax,
        sort: state.sort,
      },
      actor,
    ),
  );

  const setParams = useCallback(
    (patch: Record<string, string | null>, push = false) => {
      // read the live URL: several patches can land before the router re-renders
      const next = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      const url = `${pathname}${next.size ? `?${next}` : ""}`;
      if (push) router.push(url, { scroll: false });
      else router.replace(url, { scroll: false });
    },
    [pathname, router],
  );

  const onChange = useCallback(
    (patch: Partial<SearchState>) => {
      if ("date" in patch) planner.set({ date: patch.date ?? null });
      const p: Record<string, string | null> = {};
      if ("query" in patch) p.q = patch.query || null;
      if ("category" in patch) p.category = patch.category ?? null;
      if ("city" in patch) p.city = patch.city ?? null;
      if ("budgetMax" in patch) p.budget = patch.budgetMax ? String(patch.budgetMax) : null;
      if ("sort" in patch) p.sort = patch.sort === "rating" ? null : (patch.sort ?? null);
      if (Object.keys(p).length) setParams(p);
    },
    [planner, setParams],
  );

  const reset = useCallback(() => {
    planner.set({ date: null });
    setParams({ q: null, category: null, city: null, budget: null, sort: null });
  }, [planner, setParams]);

  // progressive rendering: a page of posts, more when the sentinel scrolls into view
  const key = `${tab}|${state.query}|${state.category}|${state.city}|${state.date}|${state.budgetMax}|${state.sort}`;
  const [limit, setLimit] = useState({ key, n: PAGE });
  const n = limit.key === key ? limit.n : PAGE;
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setLimit((l) => ({ key, n: (l.key === key ? l.n : PAGE) + PAGE })), {
      rootMargin: "800px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [key]);

  const shown = useMemo(() => items.slice(0, n), [items, n]);
  const order = items.map((x) => x.post.id);
  const filtered = Boolean(state.query || state.category || state.city || state.date || state.budgetMax);

  return (
    <div className="container-app pt-4 pb-16 md:pt-6">
      <div className="sticky top-14 z-30 -mx-4 bg-background/95 px-4 pt-2 pb-3 backdrop-blur md:top-16 md:mx-0 md:px-0">
        <div className="mx-auto max-w-3xl">
          <FeedSearch value={state} onChange={onChange} onReset={reset} count={items.length} />
        </div>
        <nav className="mx-auto mt-4 flex max-w-3xl items-center justify-center gap-1 text-sm" aria-label={t("nav.feed")}>
          {(["foryou", "top"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setParams({ tab: k === "top" ? "top" : null })}
              aria-pressed={tab === k}
              className={cn(
                "h-9 rounded-full px-4 transition-colors",
                tab === k ? "bg-ink text-white" : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
              )}
            >
              {k === "foryou" ? t("feed.forYou") : t("feed.topRated")}
            </button>
          ))}
        </nav>
      </div>

      {filtered && (
        <p className="mt-2 mb-4 text-center text-sm text-muted-foreground tabular-nums">
          {state.date ? `${t("feed.availableOn", { date: fmt(state.date, "d MMMM") })} · ` : ""}
          {items.length}
        </p>
      )}

      {shown.length ? (
        <Masonry className="-mx-4 mt-4 animate-rise sm:mx-0">
          {shown.map((item, i) => (
            <PostCard key={item.post.id} item={item} onOpen={(id) => setParams({ post: id }, true)} priority={i < 6} />
          ))}
        </Masonry>
      ) : (
        <div className="mx-auto mt-20 flex max-w-sm flex-col items-center gap-2 text-center">
          <p className="font-heading tracking-[-0.025em] text-2xl">{t("feed.empty")}</p>
          <p className="text-sm text-text-secondary">
            {t("feed.emptyHint")}
          </p>
          {filtered ? (
            <Button variant="outline" className="mt-4" onClick={reset}>
              {t("feed.reset")}
            </Button>
          ) : (
            tab === "top" && (
              <Button variant="outline" className="mt-4" onClick={() => setParams({ tab: null })}>
                {t("feed.forYou")}
              </Button>
            )
          )}
        </div>
      )}
      {n < items.length && <div ref={sentinel} className="h-px" aria-hidden />}

      <PostDialog postId={postId} order={order} onOpenChange={(o) => !o && setParams({ post: null })} />
    </div>
  );
}
