"use client";

import { differenceInCalendarDays, parseISO } from "date-fns";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { CITIES } from "@/lib/data/seed/catalog";
import type { EventItem } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * The client's upcoming event, set like a printed invitation: paper stock,
 * a gold hairline frame and the date as the largest thing on the card.
 * This is the one rich moment on the assistant screen — keep the chrome
 * around it quiet.
 */
export function InvitationCard({ event, className }: { event: EventItem; className?: string }) {
  const { t, tn, l, date } = useI18n();
  const days = differenceInCalendarDays(parseISO(event.date), new Date());
  const done = event.checklist.filter((c) => c.done).length;
  const total = event.checklist.length;

  return (
    <div className={cn("relative", className)}>
      {/* second sheet underneath, so the card reads as paper with weight */}
      <div
        className="absolute inset-0 translate-x-2 translate-y-2 rotate-[2deg] rounded-2xl border border-border bg-[var(--paper)] shadow-soft"
        aria-hidden
      />
      <Link
        href="/dashboard"
        className="group relative block rounded-2xl border border-border bg-[var(--paper)] p-3 shadow-lift transition-[box-shadow] duration-200 hover:shadow-[0_12px_32px_rgb(17_24_39/0.09)]"
      >
        <div className="flex flex-col items-center rounded-md border border-gold/50 px-8 pt-10 pb-6 text-center">
          <LogoMark className="h-3 w-auto text-gold" title="" />

          <p className="mt-6 max-w-72 font-serif text-2xl leading-tight [text-wrap:balance] text-foreground">{event.title}</p>

          <span className="mt-6 h-px w-12 bg-gold/60" aria-hidden />

          <div className="mt-6 font-serif text-7xl leading-none text-foreground [font-variant-numeric:lining-nums]">{date(event.date, "d")}</div>
          <div className="mt-2 font-serif text-xl text-foreground">{date(event.date, "MMMM yyyy")}</div>
          <div className="mt-1 text-sm text-text-secondary">{date(event.date, "EEEE")}</div>

          <p className="mt-6 text-sm text-text-secondary tabular-nums">
            {l(CITIES[event.city])} · {tn("common.guests", event.guests)}
          </p>

          <div className="mt-8 w-full border-t border-border pt-4">
            <div className="flex items-center justify-between text-xs text-text-secondary tabular-nums">
              <span>{t("home.checklist", { done, total })}</span>
              {days >= 0 && <span>{tn("dashboard.daysLeft", days)}</span>}
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-foreground/[0.06]">
              <div className="h-full rounded-full bg-primary" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-primary">
              {t("home.openPlan")}
              <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
