"use client";

import { useState } from "react";

/** "2,5" → 2.5, "1 500" → 1500, "1.2.3" → 1.23, "" / "." → undefined; integers only when `decimal` is off */
export function parseNumber(raw: string, decimal: boolean): number | undefined {
  let s = raw.replace(/\s/g, "").replace(",", ".");
  s = decimal ? s.replace(/[^\d.]/g, "") : s.replace(/\D/g, "");
  const dot = s.indexOf(".");
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "");
  if (!s || s === ".") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * A numeric text field that keeps what the user typed: «2.» while typing 2.5,
 * «1» while typing 12. The parent gets the parsed number on every change and
 * the text follows it only when the value changes from outside.
 * `empty` is the value an empty field means (e.g. 1 for «за [ ] час»).
 */
export function NumberInput({
  value,
  onChange,
  decimal = true,
  empty,
  ...rest
}: {
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  decimal?: boolean;
  empty?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "inputMode">) {
  const show = (n: number | undefined) => (n === undefined || n === empty ? "" : String(n));
  const [text, setText] = useState(() => show(value));
  const same = (a: number | undefined, b: number | undefined) => (a ?? empty) === (b ?? empty);
  // an outside change (another field, a reset, a synced tab) replaces the typed text
  if (!same(parseNumber(text, decimal), value)) setText(show(value));

  return (
    <input
      {...rest}
      value={text}
      inputMode={decimal ? "decimal" : "numeric"}
      onChange={(e) => {
        const raw = e.target.value;
        const cleaned = decimal ? raw.replace(/[^\d.,\s]/g, "") : raw.replace(/[^\d\s]/g, "");
        setText(cleaned);
        onChange(parseNumber(cleaned, decimal));
      }}
    />
  );
}
