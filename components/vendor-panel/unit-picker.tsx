"use client";

import { inputClass } from "@/components/panel";
import { NumberInput } from "@/components/ui/number-input";
import { PERIODS, type PeriodId, periodForm, periodName, unitFromPeriod } from "@/lib/data/specs";
import type { CategoryId, LText } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Periods a service is usually sold by, most likely first */
const BY_CATEGORY: Record<CategoryId, PeriodId[]> = {
  cars: ["hour", "day", "event"],
  halls: ["event", "guest", "hour", "day"],
  hosts: ["event", "evening", "hour"],
  photo: ["day", "hour", "event"],
  decor: ["event", "day", "piece"],
  music: ["evening", "hour", "event"],
  furniture: ["piece", "set", "day", "event"],
  cakes: ["kg", "piece", "set"],
  beauty: ["look", "person", "hour"],
  attire: ["day", "piece", "event"],
  traditional: ["day", "event", "piece", "set"],
  shows: ["show", "minute", "piece"],
};
const CUSTOM = "custom";

export interface UnitValue {
  per: PeriodId | typeof CUSTOM;
  qty: number;
  /** free text when `per` is custom */
  text: string;
}

export const defaultUnit = (category: CategoryId): UnitValue => ({ per: BY_CATEGORY[category][0], qty: category === "cars" ? 4 : 1, text: "" });

/** Reads an existing offer unit back into the picker: «4 часа» → 4 × hour, anything else → custom text */
export function parseUnit(unit: LText | undefined, locale: "ru" | "en", category: CategoryId): UnitValue {
  // the UI language first, then the other one (units saved by the old form may exist in one language only)
  const other = locale === "ru" ? "en" : "ru";
  for (const lang of [locale, other] as const) {
    const text = unit?.[lang]?.trim();
    if (!text) continue;
    const m = text.match(/^(\d+)\s+(.+)$/);
    const qty = m ? Number(m[1]) : 1;
    const word = (m ? m[2] : text).toLowerCase();
    for (const per of Object.keys(PERIODS) as PeriodId[]) {
      if (PERIODS[per][lang].toLowerCase().split("|").includes(word)) return { per, qty, text: "" };
    }
    if (lang === locale) return { per: CUSTOM, qty: 1, text };
  }
  const fallback = unit?.[other]?.trim();
  return fallback ? { per: CUSTOM, qty: 1, text: fallback } : defaultUnit(category);
}

export function unitText(v: UnitValue): LText {
  return v.per === CUSTOM ? { ru: v.text.trim(), en: v.text.trim() } : unitFromPeriod(v.per, v.qty);
}

/**
 * «за [4] [часа ▾]»: the vendor decides what the price is for — an hour, a few
 * hours, a day, an event, a guest, a piece — or writes their own unit.
 */
export function UnitPicker({ category, value, onChange }: { category: CategoryId; value: UnitValue; onChange: (v: UnitValue) => void }) {
  const { t, locale } = useI18n();
  // the category's usual periods, the universal ones, and whatever the offer already uses (e.g. «вечер» on a hall)
  const periods = [...new Set<PeriodId>([...BY_CATEGORY[category], "hour", "day", "event", ...(value.per !== CUSTOM ? [value.per] : [])])];
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {value.per !== CUSTOM && (
        <NumberInput
          value={value.qty}
          empty={1}
          decimal={false}
          onChange={(n) => onChange({ ...value, qty: Math.max(1, n ?? 1) })}
          placeholder="1"
          aria-label={t("specs.qty")}
          title={t("specs.qtyHint")}
          className={cn(inputClass, "w-12 shrink-0 px-1.5 text-center tabular-nums")}
        />
      )}
      <select
        value={value.per}
        onChange={(e) => onChange({ ...value, per: e.target.value as UnitValue["per"] })}
        aria-label={t("specs.period")}
        className={cn(inputClass, "w-auto min-w-0 flex-1")}
      >
        {periods.map((p) => (
          <option key={p} value={p}>
            {value.qty > 1 ? periodForm(p, value.qty, locale) : periodName(p, locale)}
          </option>
        ))}
        <option value={CUSTOM}>{t("specs.custom")}</option>
      </select>
      {value.per === CUSTOM && (
        <input
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          placeholder={t("vp.unitPlaceholder")}
          maxLength={40}
          aria-label={t("vp.unit")}
          className={cn(inputClass, "min-w-0 flex-1")}
        />
      )}
    </span>
  );
}
