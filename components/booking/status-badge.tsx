"use client";

import type { BookingStatus } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const DOT: Record<BookingStatus, string> = {
  pending: "bg-gold",
  prepaid: "bg-primary",
  confirmed: "bg-success",
  completed: "bg-muted-foreground",
  cancelled: "bg-destructive",
};

/** Quiet text + status dot — no pills */
export function StatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  const { t } = useI18n();
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-text-secondary", className)}>
      <span className={cn("size-1.5 rounded-full", DOT[status])} aria-hidden />
      {t(`booking.statuses.${status}`)}
    </span>
  );
}
