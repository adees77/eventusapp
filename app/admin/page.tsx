"use client";

import { format } from "date-fns";
import { ArrowRight, Gavel } from "lucide-react";
import Link from "next/link";
import { BarChart, LineChart } from "@/components/charts/charts";
import { Kpi } from "@/components/layout/cabinet-shell";
import { PageHeader, Section } from "@/components/panel";
import { useAdminOverview } from "@/lib/data/views/admin";
import { useI18n } from "@/lib/i18n";
import { routes } from "@/lib/routes";

export default function AdminOverview() {
  const { t, money, num, date } = useI18n();
  const { revenue, gmv, held, disputes, clients, vendors, feePercent, weeks, top } = useAdminOverview();
  const hint = (a: Date, b: Date) => `${date(format(a, "yyyy-MM-dd"), "d MMM")} — ${date(format(b, "yyyy-MM-dd"), "d MMM")}`;
  const gmvWeekly = weeks.map((w) => ({ label: format(w.start, "d.MM"), hint: hint(w.start, w.end), value: w.gmv }));
  const usersWeekly = weeks.map((w) => ({ label: format(w.start, "d.MM"), hint: hint(w.start, w.end), value: w.users }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("cabinet.overview")} subtitle={t("acab.overviewHint")} />
      {disputes.length > 0 && (
        <Link
          href={routes.adminDisputes}
          className="group flex items-center gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 px-5 py-4 text-sm"
        >
          <Gavel className="size-4 text-destructive" strokeWidth={1.5} />
          <span className="flex-1">{t("acab.disputesBanner", { n: disputes.length })}</span>
          <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label={t("acab.gmv")} value={money(gmv)} note={t("acab.gmvNote")} />
        <Kpi label={t("acab.revenue")} value={money(revenue)} note={t("acab.revenueNote", { p: feePercent })} tone="gold" />
        <Kpi label={t("acab.inEscrow")} value={money(held)} note={t("acab.inEscrowNote")} tone="primary" />
        <Kpi label={t("acab.users")} value={num(clients + vendors)} note={t("acab.usersNote", { c: num(clients), v: num(vendors) })} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Section title={t("acab.prepaidWeekly")}>
          <LineChart data={gmvWeekly} format={money} height={180} />
        </Section>
        <Section title={t("acab.signupsWeekly")}>
          <BarChart data={usersWeekly} height={180} highlightLast />
        </Section>
      </div>
      <Section title={t("acab.topVendors")}>
        <ol className="flex flex-col gap-3">
          {top.map(({ v, value }, i) => (
            <li key={v.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3 text-sm">
              <span className="text-muted-foreground tabular-nums">{i + 1}</span>
              <span className="min-w-0">
                <Link href={routes.vendor(v.slug)} className="truncate hover:underline">
                  {v.name}
                </Link>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-primary/60" style={{ width: `${(value / top[0].value) * 100}%` }} />
                </span>
              </span>
              <span className="font-medium tabular-nums">{money(value)}</span>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
