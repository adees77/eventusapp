"use client";

import { eachWeekOfInterval, endOfWeek, format, subWeeks } from "date-fns";
import { ArrowRight, Gavel } from "lucide-react";
import Link from "next/link";
import { BarChart, LineChart } from "@/components/charts/charts";
import { Kpi } from "@/components/layout/cabinet-shell";
import { PageHeader, Section } from "@/components/panel";
import { useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";

export default function AdminOverview() {
  const { t, money, num, date } = useI18n();
  const db = useDB((d) => d);
  const now = new Date();
  const sum = (k: string, from?: Date) =>
    db.transactions.filter((x) => x.kind === k && (!from || new Date(x.createdAt) >= from)).reduce((s, x) => s + x.amount, 0);
  const gmv = db.bookings.filter((b) => b.status !== "cancelled" && b.escrow).reduce((s, b) => s + b.total, 0);
  const held = db.bookings
    .filter((b) => b.escrow?.state === "held" || b.escrow?.state === "disputed")
    .reduce((s, b) => s + (b.escrow?.amount ?? 0), 0);
  const disputes = db.bookings.filter((b) => b.escrow?.state === "disputed");
  const clients = db.users.filter((u) => u.role === "client").length;
  const vendors = db.vendors.length;

  const weeks = eachWeekOfInterval({ start: subWeeks(now, 11), end: now }, { weekStartsOn: 1 });
  const range = (w: Date) => [w, endOfWeek(w, { weekStartsOn: 1 })] as const;
  const label = (w: Date) => format(w, "d.MM");
  const hint = (w: Date) => `${date(format(w, "yyyy-MM-dd"), "d MMM")} — ${date(format(range(w)[1], "yyyy-MM-dd"), "d MMM")}`;
  const gmvWeekly = weeks.map((w) => {
    const [a, b] = range(w);
    return {
      label: label(w),
      hint: hint(w),
      value: db.transactions
        .filter((x) => x.kind === "hold" && new Date(x.createdAt) >= a && new Date(x.createdAt) <= b)
        .reduce((s, x) => s + x.amount, 0),
    };
  });
  const usersWeekly = weeks.map((w) => {
    const [a, b] = range(w);
    return {
      label: label(w),
      hint: hint(w),
      value: db.users.filter((u) => u.createdAt && new Date(u.createdAt) >= a && new Date(u.createdAt) <= b).length,
    };
  });
  const top = db.vendors
    .map((v) => ({ v, value: db.transactions.filter((x) => x.vendorId === v.id && x.kind === "hold").reduce((s, x) => s + x.amount, 0) }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("cabinet.overview")} subtitle={t("acab.overviewHint")} />
      {disputes.length > 0 && (
        <Link
          href="/admin/disputes"
          className="group flex items-center gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 px-5 py-4 text-sm"
        >
          <Gavel className="size-4 text-destructive" strokeWidth={1.5} />
          <span className="flex-1">{t("acab.disputesBanner", { n: disputes.length })}</span>
          <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label={t("acab.gmv")} value={money(gmv)} note={t("acab.gmvNote")} />
        <Kpi label={t("acab.revenue")} value={money(sum("fee"))} note={t("acab.revenueNote", { p: db.settings.feePercent })} tone="gold" />
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
                <Link href={`/vendors/${v.slug}`} className="truncate hover:underline">
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
