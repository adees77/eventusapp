"use client";

/** Landing: «on any device» with the availability mock */
import { Star } from "lucide-react";
import Image from "next/image";
import { LinkButton } from "@/components/ui/link-button";
import { Monogram, VerifiedSeal } from "@/components/vendor/badges";
import { useDeviceMock, useLandingStats } from "@/lib/data/views/landing";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";

export function AnyDevice() {
  const { t, num, money } = useI18n();
  const date = nextJune14();
  const { vendor, priceFrom, availability: a, authors } = useDeviceMock(date);
  const { reviewsCount } = useLandingStats();

  return (
    <section className="container-app grid grid-cols-1 gap-10 py-14 md:py-24 lg:grid-cols-[1fr_1.1fr_0.8fr] lg:items-start">
      <div>
        <h2 className="display text-[32px] md:text-[44px]">{t("landing.anyTitle")}</h2>
        <div className="mt-10 flex flex-col gap-6 lg:mt-24">
          <div>
            <div className="text-sm font-medium">{t("landing.trustLabel")}</div>
            <div className="mt-1.5 flex items-center gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className="size-4 fill-sun text-sun" />
              ))}
              <span className="ml-2 text-xs text-muted-foreground tabular-nums">4.9 · {num(reviewsCount)}</span>
            </div>
          </div>
          <div className="flex w-fit items-center gap-3 rounded-full bg-card p-1.5 pr-5 shadow-soft">
            <span className="flex -space-x-2">
              {authors.map((n) => (
                <Monogram key={n} name={n} className="size-9 ring-2 ring-card" />
              ))}
            </span>
            <span>
              <span className="block text-md font-medium tabular-nums">{num(1289)}</span>
              <span className="block text-2xs text-muted-foreground">{t("landing.eventsDone")}</span>
            </span>
          </div>
        </div>
      </div>

      {/* dark card with a booking mockup */}
      <div className="surface-ink relative flex min-h-[340px] items-end rounded-[32px] p-5 md:min-h-[400px] md:p-7">
        {vendor?.cover && (
          <Image src={vendor.cover} alt="" fill sizes="(min-width:1024px) 480px, 100vw" className="rounded-[32px] object-cover opacity-45" />
        )}
        <div className="absolute inset-0 rounded-[32px] bg-gradient-to-t from-ink via-ink/40 to-transparent" aria-hidden />
        {vendor && (
          <div className="relative w-full rounded-3xl bg-white p-4 text-foreground">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              {vendor.name}
              {vendor.verified && <VerifiedSeal className="[&_svg]:size-3.5" />}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {t("feed.fromPrice", { amount: money(priceFrom) })}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-xs text-text-secondary">
                <span className="inline-flex gap-[3px]" aria-hidden>
                  {Array.from({ length: Math.min(a.total, 10) }, (_, i) => (
                    <span key={i} className={cn("size-2 rounded-full", i < a.free ? "bg-primary" : "bg-foreground/15")} />
                  ))}
                </span>
                {t("landing.mockFree", { free: a.free, total: a.total })}
              </span>
              <span className="rounded-full bg-sun px-3.5 py-1.5 text-xs font-medium text-sun-foreground">{t("landing.mockBook")}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-8 lg:pt-2">
        <p className="text-sm leading-relaxed text-text-secondary">{t("landing.anyText")}</p>
        <div className="w-full max-w-[260px] rounded-3xl bg-card p-5 shadow-lift lg:-ml-16 lg:mt-20">
          <div className="display text-4xl">{t("landing.fasterValue")}</div>
          <p className="mt-2 text-xs leading-relaxed text-text-secondary">{t("landing.fasterText")}</p>
          <LinkButton href={routes.welcome} variant="sun" className="mt-4 h-8 px-4 text-xs">
            {t("landing.fasterCta")}
          </LinkButton>
        </div>
      </div>
    </section>
  );
}

/** The demo's showcase date (matches the hero chat: «14 июня») */
function nextJune14() {
  const now = new Date();
  const y = now.getMonth() > 5 || (now.getMonth() === 5 && now.getDate() > 14) ? now.getFullYear() + 1 : now.getFullYear();
  return `${y}-06-14`;
}
