"use client";

import { BadgeCheck, Star } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Gold seal — the only place gold appears next to vendor names */
export function VerifiedSeal({ className, withLabel }: { className?: string; withLabel?: boolean }) {
  const { t } = useI18n();
  return (
    <span className={cn("inline-flex items-center gap-1 text-gold-foreground", className)} title={t("common.verified")}>
      <BadgeCheck className="size-4 text-gold" strokeWidth={1.75} aria-hidden />
      {withLabel ? <span className="text-xs">{t("common.verified")}</span> : <span className="sr-only">{t("common.verified")}</span>}
    </span>
  );
}

export function Rating({ value, count, className }: { value: number; count?: number; className?: string }) {
  const { num } = useI18n();
  if (!value) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm tabular-nums", className)}>
      <Star className="size-3.5 fill-gold text-gold" strokeWidth={1.5} aria-hidden />
      <span className="text-foreground">{value.toFixed(1)}</span>
      {count !== undefined && <span className="text-muted-foreground">({num(count)})</span>}
    </span>
  );
}

/** Vendors have no logos in the seed: a quiet serif monogram on soft blue */
export function Monogram({ name, className }: { name: string; className?: string }) {
  const letters = name
    .replace(/[«»"]/g, "")
    .split(/\s+/)
    .filter((w) => /^[\p{L}]/u.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-secondary font-serif text-secondary-foreground",
        className,
      )}
      aria-hidden
    >
      {letters}
    </span>
  );
}
