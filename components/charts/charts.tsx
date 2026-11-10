"use client";

/**
 * Small single-series charts for the cabinets. One hue (brand primary),
 * thin marks, a recessive baseline, and a hover tooltip on every mark.
 * No chart library: plain SVG/HTML, sized by its container.
 */
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export interface Point {
  label: string;
  value: number;
  /** tooltip title, defaults to label */
  hint?: string;
}

function Tooltip({ x, children }: { x: number; children: React.ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lift"
      style={{ left: `${x}%` }}
      role="status"
    >
      {children}
    </div>
  );
}

/** Vertical bars with 4px rounded tops anchored to the baseline */
export function BarChart({
  data,
  format = String,
  height = 160,
  className,
  highlightLast,
}: {
  data: Point[];
  format?: (n: number) => string;
  height?: number;
  className?: string;
  highlightLast?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;
  return (
    <figure className={cn("w-full", className)}>
      <div className="relative" style={{ height }}>
        <div className="absolute inset-x-0 bottom-0 h-px bg-border" aria-hidden />
        <div className="absolute inset-0 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
          {data.map((d, i) => {
            const h = d.value ? Math.max(2, (d.value / max) * (height - 8)) : 0;
            const active = hover === i || (hover === null && highlightLast && i === n - 1);
            return (
              <button
                key={`${d.label}-${i}`}
                type="button"
                className="group relative flex h-full flex-1 items-end justify-center outline-none"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={`${d.hint ?? d.label}: ${format(d.value)}`}
              >
                <span
                  className={cn(
                    "w-full max-w-7 rounded-t-[4px] transition-colors",
                    active ? "bg-primary" : "bg-primary/35 group-hover:bg-primary/60",
                  )}
                  style={{ height: h }}
                />
              </button>
            );
          })}
        </div>
        {hover !== null && (
          <Tooltip x={((hover + 0.5) / n) * 100}>
            <div className="text-muted-foreground">{data[hover].hint ?? data[hover].label}</div>
            <div className="font-medium tabular-nums">{format(data[hover].value)}</div>
          </Tooltip>
        )}
      </div>
      <Axis labels={data.map((d) => d.label)} />
    </figure>
  );
}

function Axis({ labels }: { labels: string[] }) {
  // show at most ~7 labels to avoid collisions
  const step = Math.ceil(labels.length / 7);
  return (
    <div className="mt-2 flex text-2xs text-muted-foreground tabular-nums" aria-hidden>
      {labels.map((l, i) => (
        <span key={`${l}-${i}`} className="flex-1 truncate text-center">
          {i % step === 0 || i === labels.length - 1 ? l : ""}
        </span>
      ))}
    </div>
  );
}

/** 2px line with a soft area and a crosshair tooltip */
export function LineChart({
  data,
  format = String,
  height = 160,
  className,
}: {
  data: Point[];
  format?: (n: number) => string;
  height?: number;
  className?: string;
}) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const W = 100;
  const H = 100;
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = Math.max(1, data.length - 1);
  const pts = data.map((d, i) => [(i / n) * W, H - (d.value / max) * (H - 6)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  return (
    <figure className={cn("w-full", className)}>
      <div
        className="relative"
        style={{ height }}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover(Math.round(((e.clientX - r.left) / r.width) * n));
        }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id={`${id}-a`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--primary)" stopOpacity="0.14" />
              <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="0" x2={W} y1={H} y2={H} stroke="var(--border)" vectorEffect="non-scaling-stroke" />
          <path d={area} fill={`url(#${id}-a)`} />
          <path
            d={line}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {hover !== null && pts[hover] && (
            <line x1={pts[hover][0]} x2={pts[hover][0]} y1="0" y2={H} stroke="var(--border)" vectorEffect="non-scaling-stroke" />
          )}
        </svg>
        {hover !== null && pts[hover] && (
          <>
            <span
              className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-primary"
              style={{ left: `${pts[hover][0]}%`, top: `${pts[hover][1]}%` }}
            />
            <Tooltip x={pts[hover][0]}>
              <div className="text-muted-foreground">{data[hover].hint ?? data[hover].label}</div>
              <div className="font-medium tabular-nums">{format(data[hover].value)}</div>
            </Tooltip>
          </>
        )}
      </div>
      <Axis labels={data.map((d) => d.label)} />
      <table className="sr-only">
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <td>{d.hint ?? d.label}</td>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Funnel: horizontal bars, share of the first step, labels in text ink */
export function Funnel({ steps, format = String }: { steps: { label: string; value: number }[]; format?: (n: number) => string }) {
  const top = Math.max(1, steps[0]?.value ?? 1);
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((s, i) => {
        const share = s.value / top;
        return (
          <li key={s.label} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
            <span className="truncate text-text-secondary">{s.label}</span>
            <span className="h-2 overflow-hidden rounded-full bg-muted" title={`${Math.round(share * 100)}%`}>
              <span
                className={cn("block h-full rounded-full", i === steps.length - 1 ? "bg-primary" : "bg-primary/45")}
                style={{ width: `${Math.max(share * 100, s.value ? 2 : 0)}%` }}
              />
            </span>
            <span className="w-16 text-right font-medium tabular-nums">
              {format(s.value)}
              {i > 0 && <span className="ml-1 text-2xs font-normal text-muted-foreground">{Math.round(share * 100)}%</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Tiny inline trend for stat tiles */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(1, ...values);
  const n = Math.max(1, values.length - 1);
  const d = values.map((v, i) => `${i ? "L" : "M"}${(i / n) * 100},${30 - (v / max) * 26}`).join(" ");
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={cn("h-8 w-24", className)} aria-hidden>
      <path d={d} fill="none" stroke="var(--primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
