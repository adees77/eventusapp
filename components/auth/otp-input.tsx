"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Six code boxes backed by one real input: paste, SMS/email autofill
 * (one-time-code), backspace and screen readers all work as for a normal field.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  invalid,
  autoFocus,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  invalid?: boolean;
  autoFocus?: boolean;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const active = Math.min(value.length, length - 1);

  return (
    <div className="relative" onClick={() => ref.current?.focus()}>
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d*"
        maxLength={length}
        autoFocus={autoFocus}
        aria-label={label}
        aria-invalid={invalid}
        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
      />
      <div className="grid grid-cols-6 gap-2" aria-hidden>
        {Array.from({ length }, (_, i) => (
          <div
            key={i}
            className={cn(
              "flex h-14 items-center justify-center rounded-xl border bg-card text-2xl tabular-nums transition-colors",
              invalid ? "border-destructive/60" : focused && i === active ? "border-primary" : "border-border",
            )}
          >
            {value[i] ?? (focused && i === active ? <span className="h-6 w-px animate-pulse bg-primary" /> : "")}
          </div>
        ))}
      </div>
    </div>
  );
}
