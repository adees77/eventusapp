"use client";

import { cn } from "@/lib/utils";

/** Shared building blocks for the client / vendor / admin panels. */

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="display text-[32px] md:text-[44px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Section({
  title,
  action,
  children,
  className,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-3xl bg-card p-4 md:p-6", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-medium">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-3xl bg-card p-5 md:p-6">
      <div className="text-sm text-text-secondary">{label}</div>
      <div className="mt-2 text-3xl leading-none font-medium tabular-nums">{value}</div>
      {note && <div className="mt-2 text-xs text-muted-foreground">{note}</div>}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-text-secondary">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "h-10 w-full rounded-lg border border-transparent bg-foreground/[0.045] px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";
export const textareaClass =
  "w-full resize-none rounded-lg border border-transparent bg-foreground/[0.045] px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div role="tablist" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:px-0">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-9 shrink-0 rounded-full px-4 text-sm transition-colors",
            value === o.value ? "bg-ink text-white" : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-text-secondary">
      {children}
      {action}
    </div>
  );
}
