"use client";

/** Landing: celebration packages priced from the catalog */
import { ArrowRight, CalendarCheck, Check } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { useCategories } from "@/lib/data/views/catalog";
import { usePackageBudgets } from "@/lib/data/views/landing";
import type { CategoryId } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Heading } from "./heading";
import { routes } from "@/lib/routes";

type Pkg = { key: "toy" | "wedding" | "jubilee"; cats: CategoryId[]; cars: number; guests: number };

const PACKAGES: Pkg[] = [
  { key: "toy", cats: ["halls", "hosts", "music", "photo", "decor", "cakes"], cars: 3, guests: 150 },
  { key: "wedding", cats: ["halls", "hosts", "photo", "decor", "music", "beauty", "cakes"], cars: 5, guests: 300 },
  { key: "jubilee", cats: ["halls", "hosts", "music", "cakes", "photo"], cars: 0, guests: 80 },
];

export function Packages() {
  const { t, l, money } = useI18n();
  const categories = useCategories();
  const catName = (id: CategoryId) => {
    const c = categories.find((x) => x.id === id);
    return c ? l(c.name) : id;
  };
  const budgets = usePackageBudgets(PACKAGES);

  return (
    <section id="packages" className="container-app scroll-mt-6 py-14 md:py-24">
      <Heading title={t("landing.pkgTitle")} text={t("landing.pkgText")} />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {PACKAGES.map((p, i) => {
          const hot = i === 1;
          return (
            <div key={p.key} className={cn("surface-ink flex flex-col rounded-[28px] p-6", hot && "md:-translate-y-3")}>
              <div className="flex flex-col items-center text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-white/10">
                  <CalendarCheck className="size-[18px] text-white/80" strokeWidth={1.5} />
                </span>
                <span
                  className={cn(
                    "mt-4 rounded-full px-3 py-1 text-xs",
                    hot ? "bg-sun text-sun-foreground" : "bg-white/10 text-white/75",
                  )}
                >
                  {hot ? t("landing.pkgPopular") : t(`landing.pkg.${p.key}Guests`)}
                </span>
                <div className="mt-4 text-sm text-white/60">
                  {t(`landing.pkg.${p.key}`)}
                  {hot && ` · ${t(`landing.pkg.${p.key}Guests`)}`}
                </div>
                <div className="display mt-1 text-[34px] tabular-nums">
                  <span className="mr-1.5 text-base text-white/50">{t("landing.pkgFrom")}</span>
                  {money(budgets[i])}
                </div>
              </div>
              <ul className="mt-6 flex flex-1 flex-col gap-2.5 text-sm text-white/80">
                {p.cats.map((c) => (
                  <li key={c} className="flex items-center gap-2.5">
                    <span className="flex size-4 items-center justify-center rounded-full bg-white/90">
                      <Check className="size-2.5 text-ink" strokeWidth={3} />
                    </span>
                    {catName(c)}
                  </li>
                ))}
                {p.cars > 0 && (
                  <li className="flex items-center gap-2.5">
                    <span className="flex size-4 items-center justify-center rounded-full bg-white/90">
                      <Check className="size-2.5 text-ink" strokeWidth={3} />
                    </span>
                    {t("landing.pkg.cars", { n: p.cars })}
                  </li>
                )}
              </ul>
              <LinkButton
                href={routes.ask(t(`landing.pkg.${p.key}Q`))}
                variant={hot ? "sun" : "default"}
                className={cn("mx-auto mt-7 h-10 px-5", !hot && "bg-white/10 text-white hover:bg-white/15")}
              >
                {t("landing.pkgCta")}
                <ArrowRight />
              </LinkButton>
            </div>
          );
        })}
      </div>
    </section>
  );
}
