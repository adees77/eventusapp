"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EscrowBadge } from "@/components/booking/deal-card";
import { StatusBadge } from "@/components/booking/status-badge";
import { PageHeader, inputClass } from "@/components/panel";
import { useAdminBookings } from "@/lib/data/views/admin";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";

export default function AdminBookings() {
  const { t, l, money, date } = useI18n();
  const [q, setQ] = useState("");
  const { rows, total } = useAdminBookings(q);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("cabinet.bookings")} subtitle={t("acab.bookingsCount", { n: total })} />
      <label className="relative block max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.search")} className={cn(inputClass, "pl-9")} />
      </label>
      <div className="overflow-x-auto rounded-2xl bg-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-normal">{t("vcab.colDate")}</th>
              <th className="px-4 py-3 font-normal">{t("acab.vendor")}</th>
              <th className="px-4 py-3 font-normal">{t("vcab.colClient")}</th>
              <th className="px-4 py-3 font-normal">{t("admin.status")}</th>
              <th className="px-4 py-3 text-right font-normal">{t("booking.total")}</th>
              <th className="px-4 py-3 font-normal" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ booking: b, vendorName, offerTitle, clientName, conversationId }) => {
              return (
                <tr key={b.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-text-secondary tabular-nums">{date(b.date, "d MMM yyyy")}</td>
                  <td className="px-4 py-3">
                    <div>{vendorName}</div>
                    <div className="max-w-56 truncate text-xs text-muted-foreground">{l(offerTitle)}</div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{clientName || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <StatusBadge status={b.status} />
                      {b.escrow && <EscrowBadge booking={b} />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(b.total)}</td>
                  <td className="px-4 py-3 text-right">
                    {conversationId && (
                      <Link href={routes.chat(conversationId)} className="text-primary hover:underline">
                        {t("dashboard.chat")}
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
