"use client";

import Link from "next/link";
import { EscrowBadge, EscrowSteps } from "@/components/booking/deal-card";
import { Kpi } from "@/components/layout/cabinet-shell";
import { Empty, PageHeader, Section } from "@/components/panel";
import { useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { clientMoney } from "@/lib/payments/escrow";
import { useActor } from "@/lib/session";

export default function ClientPayments() {
  const { t, l, money, date } = useI18n();
  const actor = useActor();
  const db = useDB((d) => d);
  const m = clientMoney(actor.id, db.bookings);
  const paid = db.bookings
    .filter((b) => b.clientId === actor.id && b.escrow)
    .sort((a, b) => (b.escrow!.heldAt ?? "").localeCompare(a.escrow!.heldAt ?? ""));
  const tx = db.transactions
    .filter((x) => x.clientId === actor.id && (x.kind === "hold" || x.kind === "refund"))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("cabinet.payments")} subtitle={t("cabinet.paymentsHint")} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label={t("cabinet.frozen")} value={money(m.held)} note={t("cabinet.frozenNote")} tone="primary" />
        <Kpi label={t("cabinet.released")} value={money(m.released)} note={t("cabinet.releasedNote")} />
        <Kpi label={t("cabinet.refunded")} value={money(m.refunded)} />
      </div>

      <Section title={t("cabinet.deals")}>
        {paid.length ? (
          <ul className="flex flex-col divide-y divide-border">
            {paid.map((b) => {
              const v = db.vendors.find((x) => x.id === b.vendorId);
              const o = db.offers.find((x) => x.id === b.offerId);
              const conv = db.conversations.find((c) => c.bookingId === b.id);
              return (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{v?.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {l(o?.title)} · {date(b.date, "d MMM yyyy")}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <EscrowBadge booking={b} />
                    <span className="w-28 text-right text-sm font-medium tabular-nums">{money(b.escrow!.amount)}</span>
                    {conv && (
                      <Link href={`/messages/${conv.id}`} className="text-sm text-primary hover:underline">
                        {t("dashboard.chat")}
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty>{t("cabinet.noPayments")}</Empty>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={t("cabinet.history")}>
          {tx.length ? (
            <ul className="flex flex-col gap-2 text-sm">
              {tx.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3">
                  <span className="text-text-secondary">
                    {t(`cabinet.tx.${x.kind}`)} · {date(x.createdAt.slice(0, 10), "d MMM")}
                  </span>
                  <span className="tabular-nums">
                    {x.kind === "refund" ? "+" : "−"}
                    {money(x.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>{t("cabinet.noPayments")}</Empty>
          )}
        </Section>
        <Section title={t("escrow.title")}>
          <EscrowSteps className="sm:grid-cols-1" />
          <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">{t("escrow.refundPolicy")}</p>
        </Section>
      </div>
    </div>
  );
}
