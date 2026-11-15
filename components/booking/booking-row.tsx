"use client";

import Image from "next/image";
import Link from "next/link";
import type { BookingView } from "@/lib/data/views/_shared";
import { useI18n } from "@/lib/i18n";
import { EscrowBadge } from "./deal-card";
import { StatusBadge } from "./status-badge";
import { routes } from "@/lib/routes";

/** One booking line for dashboards. `perspective` decides whose name is shown. */
export function BookingRow({ row, perspective, actions }: { row: BookingView; perspective: "client" | "vendor"; actions?: React.ReactNode }) {
  const { l, money, date } = useI18n();
  const { booking: b, offerTitle, offerPhoto, vendorName, vendorSlug, clientName } = row;
  if (!offerTitle || !vendorSlug) return null;
  const who = perspective === "client" ? vendorName : clientName;

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-muted">
          {offerPhoto && <Image src={offerPhoto} alt="" fill sizes="48px" className="object-cover" />}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            {perspective === "client" ? (
              <Link href={routes.vendor(vendorSlug)} className="hover:underline">
                {who}
              </Link>
            ) : (
              who
            )}
          </div>
          <div className="truncate text-sm text-text-secondary">
            {l(offerTitle)} · {b.qty}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
            <span>{date(b.date, "d MMMM yyyy")}</span>
            <span>{money(b.total)}</span>
            <StatusBadge status={b.status} />
            {b.escrow && b.escrow.state !== "none" && <EscrowBadge booking={b} />}
          </div>
        </div>
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </li>
  );
}
