"use client";

import { useEffect, useState } from "react";
import { RSVP_BUCKETS, bucketCounts, type GuestRow, type RsvpBucket } from "@/lib/invitations/design";
import { cn } from "@/lib/utils";

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  /** any CSS colour, e.g. `var(--success)` */
  color: string;
}

const R = 70;
const C = 2 * Math.PI * R;
const STROKE = 22;
const STROKE_ON = 30;
/** how far the picked slice slides out of the ring */
const POP = 7;

/**
 * Interactive ring chart. Slices draw themselves in on mount; a tap on a slice
 * (or its legend row) slides it out of the ring, fades the rest and shows its
 * number in the middle. A second tap puts it back.
 */
export function RsvpDonut({
  slices,
  selected,
  onSelect,
  center,
  empty,
  className,
}: {
  slices: DonutSlice[];
  selected: string | null;
  onSelect: (key: string | null) => void;
  /** what the middle shows when nothing is picked */
  center: { value: string; label: string };
  /** shown in the middle of a dashed ring when there is no data yet */
  empty?: React.ReactNode;
  className?: string;
}) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const total = slices.reduce((s, x) => s + x.value, 0);
  const live = slices.filter((s) => s.value > 0);
  const gap = live.length > 1 ? 3 : 0;
  const picked = slices.find((s) => s.key === selected && s.value > 0) ?? null;

  let start = 0;
  const arcs = live.map((s) => {
    const len = (s.value / total) * C;
    const mid = ((start + len / 2) / C) * 2 * Math.PI;
    const arc = { ...s, start, len: Math.max(len - gap, 0.001), dx: Math.sin(mid) * POP, dy: -Math.cos(mid) * POP };
    start += len;
    return arc;
  });

  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-[260px]", className)}>
      <svg viewBox="0 0 200 200" className="size-full overflow-visible" aria-hidden>
        {total === 0 ? (
          <circle cx={100} cy={100} r={R} fill="none" stroke="currentColor" strokeWidth={STROKE} className="text-foreground/[0.06]" />
        ) : (
          arcs.map((a) => {
            const on = picked?.key === a.key;
            return (
              <circle
                key={a.key}
                cx={100}
                cy={100}
                r={R}
                fill="none"
                stroke={a.color}
                strokeLinecap="butt"
                strokeWidth={on ? STROKE_ON : STROKE}
                strokeDasharray={drawn ? `${a.len} ${C - a.len}` : `0 ${C}`}
                strokeDashoffset={drawn ? -a.start : 0}
                onClick={() => onSelect(on ? null : a.key)}
                className="cursor-pointer"
                style={{
                  transform: `translate(${on ? a.dx : 0}px, ${on ? a.dy : 0}px) rotate(-90deg)`,
                  transformOrigin: "100px 100px",
                  opacity: picked && !on ? 0.28 : 1,
                  transition:
                    "stroke-dasharray 1000ms var(--ease-out-soft), stroke-dashoffset 1000ms var(--ease-out-soft), transform 450ms var(--ease-out-soft), stroke-width 450ms var(--ease-out-soft), opacity 300ms ease",
                }}
              />
            );
          })
        )}
      </svg>
      <div className="pointer-events-none absolute inset-[24%] flex flex-col items-center justify-center text-center">
        {total === 0 && empty ? (
          empty
        ) : (
          <div key={picked?.key ?? "all"} className="flex animate-rise flex-col items-center">
            <span className="font-heading text-[40px] leading-none tracking-[-0.04em] tabular-nums">
              {picked ? picked.value : center.value}
            </span>
            <span className="mt-1.5 max-w-[9rem] text-xs leading-tight text-text-secondary">
              {picked ? `${picked.label} · ${Math.round((picked.value / total) * 100)}%` : center.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Legend that doubles as the slice picker */
export function DonutLegend({
  slices,
  selected,
  onSelect,
  className,
}: {
  slices: DonutSlice[];
  selected: string | null;
  onSelect: (key: string | null) => void;
  className?: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  return (
    <ul className={cn("flex flex-col gap-1", className)}>
      {slices.map((s) => {
        const on = selected === s.key;
        return (
          <li key={s.key}>
            <button
              type="button"
              aria-pressed={on}
              disabled={s.value === 0}
              onClick={() => onSelect(on ? null : s.key)}
              className={cn(
                "flex h-12 w-full items-center gap-3 rounded-2xl px-3.5 text-left transition-colors disabled:opacity-45",
                on ? "bg-ink text-white" : "hover:bg-foreground/[0.045]",
              )}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="min-w-0 flex-1 truncate text-sm">{s.label}</span>
              <span className={cn("text-xs tabular-nums", on ? "text-white/60" : "text-muted-foreground")}>
                {total ? `${Math.round((s.value / total) * 100)}%` : ""}
              </span>
              <span className={cn("w-8 text-right font-heading text-lg tabular-nums", on && "text-sun")}>{s.value}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Height-animated disclosure (grid-rows 0fr → 1fr) */
export function Reveal({ open, children, className }: { open: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("grid transition-[grid-template-rows,opacity] duration-500 ease-[var(--ease-out-soft)]", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0", className)}
      aria-hidden={!open}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

export const BUCKET_COLOR: Record<RsvpBucket, string> = {
  coming: "var(--success)",
  waiting: "var(--gold)",
  declined: "color-mix(in oklch, var(--destructive) 70%, white)",
  draft: "color-mix(in oklch, var(--ink) 18%, white)",
};

/** Donut slices for a set of guest rows */
export function bucketSlices(rows: GuestRow[], t: (key: `inv.bucket_${RsvpBucket}`) => string): DonutSlice[] {
  const c = bucketCounts(rows);
  return RSVP_BUCKETS.map((b) => ({ key: b, label: t(`inv.bucket_${b}`), value: c[b], color: BUCKET_COLOR[b] }));
}
