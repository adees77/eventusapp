"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { DatePicker } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { VendorCard } from "@/components/vendor/vendor-card";
import { searchVendors, type VendorFilters } from "@/lib/data/queries";
import { CITIES } from "@/lib/data/seed/catalog";
import { useDB } from "@/lib/data/store";
import type { CategoryId } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { usePlanner } from "@/lib/planner";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

export default function CatalogPage() {
  return (
    <Suspense>
      <Catalog />
    </Suspense>
  );
}

function Catalog() {
  const { t, tn, l } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const actor = useActor();
  const planner = usePlanner();

  const category = (params.get("category") as CategoryId | null) ?? null;
  const city = params.get("city");
  const sort = (params.get("sort") as VendorFilters["sort"]) ?? "rating";
  const date = planner.date;
  const [query, setQuery] = useState("");

  const categories = useDB((db) => [...db.categories].sort((a, b) => a.order - b.order));
  const results = useDB((db) => searchVendors(db, { category, city, date, sort, query }, actor));

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  const hasFilters = Boolean(category || city || date || query);
  const cityOptions = useMemo(() => Object.entries(CITIES), []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-16 md:px-6 md:pt-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-medium tracking-tight md:text-4xl">{t("catalog.title")}</h1>
        <p className="text-sm text-text-secondary">{t("catalog.subtitle")}</p>
      </header>

      <nav className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0" aria-label={t("catalog.title")}>
        <Chip active={!category} onClick={() => setParam("category", null)}>
          {t("common.all")}
        </Chip>
        {categories.map((c) => (
          <Chip key={c.id} active={category === c.id} onClick={() => setParam("category", c.id)}>
            <CategoryIcon id={c.id} className="size-4" />
            {l(c.name)}
          </Chip>
        ))}
      </nav>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-[1fr_200px_200px_200px]">
        <label className="relative col-span-2 md:col-span-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("catalog.search")}
            className="h-10 w-full rounded-lg border border-input bg-card pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </label>
        <DatePicker value={date} onChange={(d) => planner.set({ date: d })} className="col-span-2 md:col-span-1" />
        <NativeSelect value={city ?? ""} onChange={(e) => setParam("city", e.target.value || null)} aria-label={t("catalog.city")}>
          <option value="">{t("catalog.anyCity")}</option>
          {cityOptions.map(([id, name]) => (
            <option key={id} value={id}>
              {l(name)}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={sort} onChange={(e) => setParam("sort", e.target.value)} aria-label={t("catalog.sort")}>
          <option value="rating">{t("catalog.sortRating")}</option>
          <option value="priceAsc">{t("catalog.sortPriceAsc")}</option>
          <option value="priceDesc">{t("catalog.sortPriceDesc")}</option>
        </NativeSelect>
      </div>

      <div className="mt-6 flex h-8 items-center justify-between text-sm text-muted-foreground">
        <span className="tabular-nums">{tn("catalog.count", results.length)}</span>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              planner.set({ date: null });
              router.replace(pathname, { scroll: false });
            }}
            className="text-sm text-primary hover:underline"
          >
            {t("catalog.resetFilters")}
          </button>
        )}
      </div>

      {results.length ? (
        <div className="mt-4 grid animate-rise gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r, i) => (
            <VendorCard key={r.vendor.id} r={r} date={date} priority={i < 3} />
          ))}
        </div>
      ) : (
        <div className="mt-16 flex flex-col items-center gap-2 text-center">
          <p className="font-serif text-2xl">{t("catalog.empty")}</p>
          <p className="text-sm text-text-secondary">{t("catalog.emptyHint")}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setQuery("");
              planner.set({ date: null });
              router.replace(pathname);
            }}
          >
            {t("catalog.resetFilters")}
          </Button>
        </div>
      )}
    </div>
  );
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-sm whitespace-nowrap transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-text-secondary hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
