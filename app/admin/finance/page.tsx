"use client";

import { useState } from "react";
import { Kpi } from "@/components/layout/cabinet-shell";
import { PageHeader, Segmented } from "@/components/panel";
import { useDB } from "@/lib/data/store";
import type { TransactionKind } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";

const KINDS: TransactionKind[] = ["hold", "release", "fee", "refund", "payout"];

export default function AdminFinance() {
  const { t, money, date } = useI18n();
  const db = useDB((d) => d);
  const [k, setK] = useState<TransactionKind | "all">("all");
  const sum = (kind: TransactionKind) => db.transactions.filter((x) => x.kind === kind).reduce((s, x) => s + x.amount, 0);
  const tx = db.transactions.filter((x) => k === "all" || x.kind === k).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const name = (id?: string) => (id ? (db.users.find((u) => u.id === id)?.name ?? "—") : "—");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("vcab.finance")} subtitle={t("acab.financeHint")} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {KINDS.map((kind) => (
          <Kpi key={kind} label={t(`cabinet.tx.${kind}`)} value={money(sum(kind))} tone={kind === "fee" ? "gold" : undefined} />
        ))}
      </div>
      <Segmented
        value={k}
        onChange={setK}
        options={[{ value: "all", label: t("common.all") }, ...KINDS.map((x) => ({ value: x, label: t(`cabinet.tx.${x}`) }))]}
      />
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-normal">{t("vcab.colDate")}</th>
              <th className="px-4 py-3 font-normal">{t("vcab.colOp")}</th>
              <th className="px-4 py-3 font-normal">{t("acab.vendor")}</th>
              <th className="px-4 py-3 font-normal">{t("vcab.colClient")}</th>
              <th className="px-4 py-3 text-right font-normal">{t("vcab.colAmount")}</th>
            </tr>
          </thead>
          <tbody>
            {tx.map((x) => (
              <tr key={x.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-text-secondary tabular-nums">{date(x.createdAt.slice(0, 10), "d MMM yyyy")}</td>
                <td className="px-4 py-3">{t(`cabinet.tx.${x.kind}`)}</td>
                <td className="px-4 py-3 text-text-secondary">{db.vendors.find((v) => v.id === x.vendorId)?.name ?? "—"}</td>
                <td className="px-4 py-3 text-text-secondary">{name(x.clientId)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{money(x.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
