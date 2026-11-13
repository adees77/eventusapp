"use client";

import Image from "next/image";
import type { Offer, Vendor } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Order summary: photo, vendor, item, date, qty, totals. Used in booking, checkout, chat. */
export function BookingSummary({
  vendor,
  offer,
  date,
  qty,
  total,
  prepay,
  prepayPercent,
  compact,
  className,
  children,
}: {
  vendor: Vendor;
  offer: Offer;
  date?: string | null;
  qty: number;
  total: number;
  prepay: number;
  prepayPercent: number;
  compact?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const { t, l, money, date: fmt } = useI18n();
  return (
    <div className={cn("rounded-2xl bg-card", compact ? "p-3" : "p-5", className)}>
      <div className="flex gap-3">
        <div className={cn("relative shrink-0 overflow-hidden rounded-xl bg-muted", compact ? "size-14" : "size-20")}>
          {offer.photos[0] && <Image src={offer.photos[0]} alt="" fill sizes="80px" className="object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs text-muted-foreground">{vendor.name}</div>
          <div className={cn("font-medium", compact ? "line-clamp-1 text-sm" : "text-md")}>{l(offer.title)}</div>
          <div className="mt-0.5 text-sm text-text-secondary tabular-nums">
            {date ? fmt(date, "d MMMM yyyy, EEEEEE") : t("booking.selectDate")} · {qty} × {money(offer.price)}
          </div>
        </div>
        {children}
      </div>
      {!compact && (
        <dl className="mt-5 flex flex-col gap-2 border-t border-border pt-4 text-sm tabular-nums">
          <div className="flex justify-between">
            <dt className="text-text-secondary">{t("booking.total")}</dt>
            <dd>{money(total)}</dd>
          </div>
          <div className="flex justify-between text-md">
            <dt className="font-medium">{t("booking.prepay", { p: prepayPercent })}</dt>
            <dd className="font-medium">{money(prepay)}</dd>
          </div>
          <p className="pt-1 text-xs text-muted-foreground">{t("booking.rest")}</p>
        </dl>
      )}
    </div>
  );
}
