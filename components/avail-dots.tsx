"use client";

import type { Availability } from "@/lib/data/availability";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * EVENTUS signature: one dot per unit, filled = free.
 * Large inventories (chairs, tables) switch to a thin proportional bar.
 */
export function AvailDots({
  a,
  className,
  showLabel = true,
  size = "md",
}: {
  a: Availability;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}) {
  const { t } = useI18n();
  const soldOut = a.free === 0;
  const dot = size === "sm" ? "size-1.5" : "size-2";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {a.total <= 10 ? (
        <span className="inline-flex items-center gap-[3px]" aria-hidden>
          {Array.from({ length: a.total }, (_, i) => (
            <span
              key={i}
              className={cn(dot, "rounded-full", i < a.free ? "bg-primary" : "border border-foreground/20 bg-transparent")}
            />
          ))}
        </span>
      ) : (
        <span className="relative h-1 w-12 overflow-hidden rounded-full bg-foreground/10" aria-hidden>
          <span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${(a.free / a.total) * 100}%` }} />
        </span>
      )}
      {showLabel && (
        <span className={cn("text-xs tabular-nums", soldOut ? "text-muted-foreground" : "text-text-secondary")}>
          {soldOut ? t("avail.soldOut") : t("avail.free", { free: a.free, total: a.total })}
        </span>
      )}
    </span>
  );
}
