"use client";

import { Check, Plus, X } from "lucide-react";
import { inputClass, textareaClass } from "@/components/panel";
import { NumberInput } from "@/components/ui/number-input";
import {
  CATEGORY_SPECS,
  type DurationField,
  fill,
  type ItemField,
  type ListField,
  listTotal,
  type PeriodId,
  periodForm,
  periodName,
  type PriceField,
  type SpecField,
} from "@/lib/data/specs";
import type { CategoryId, SpecItem, SpecValue, VendorSpecs } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Rec = Record<string, unknown>;
type Patch = (p: Record<string, SpecValue | undefined>) => void;

/** Editable category details: counts, chips, toggles, prices with a period, lists (fleet, menus, inventory) */
export function SpecsForm({ category, value, onChange }: { category: CategoryId; value: VendorSpecs; onChange: (next: VendorSpecs) => void }) {
  const { l } = useI18n();
  const patch: Patch = (p) => {
    const next: Rec = { ...value };
    for (const [k, v] of Object.entries(p)) {
      if (v === undefined || v === "") delete next[k];
      else next[k] = v;
    }
    onChange(next as VendorSpecs);
  };

  return (
    <div className="flex flex-col gap-8">
      {CATEGORY_SPECS[category].map((g) => {
        const toggles = g.fields.filter((f) => f.kind === "bool");
        const rest = g.fields.filter((f) => f.kind !== "bool");
        return (
          <section key={g.title.ru} className="flex flex-col gap-4">
            <div className="border-b border-border pb-2">
              <h3 className="text-sm font-medium">{l(g.title)}</h3>
              {g.hint && <p className="mt-0.5 text-xs text-muted-foreground">{l(g.hint)}</p>}
            </div>
            {rest.map((f) => (
              <FieldRow key={f.id} field={f} src={value as Rec} patch={patch} />
            ))}
            {toggles.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {toggles.map((f) => {
                  const on = value[f.id] === true;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => patch({ [f.id]: on ? undefined : true })}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        on ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border",
                          on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                        )}
                      >
                        {on && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      {l(f.label)}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Label({ field: f }: { field: SpecField }) {
  const { l } = useI18n();
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-sm text-text-secondary">{l(f.label)}</span>
      {f.hint && <span className="text-xs text-muted-foreground">{l(f.hint)}</span>}
    </span>
  );
}

function FieldRow({ field: f, src, patch }: { field: SpecField; src: Rec; patch: Patch }) {
  const { l } = useI18n();
  const value = src[f.id] as SpecValue | undefined;

  if (f.kind === "bool") return null; // rendered as toggles by the group
  if (f.kind === "list") return <ListEditor field={f} rows={(value as SpecItem[] | undefined) ?? []} onChange={(rows) => patch({ [f.id]: rows })} />;

  if (f.kind === "multi" || f.kind === "select") {
    const picked = f.kind === "multi" ? ((value as string[] | undefined) ?? []) : value ? [String(value)] : [];
    const toggle = (id: string) => {
      if (f.kind === "select") return patch({ [f.id]: picked[0] === id ? undefined : id });
      const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id];
      patch({ [f.id]: next.length ? next : undefined });
    };
    return (
      <div className="flex flex-col gap-2">
        <Label field={f} />
        <div className="flex flex-wrap gap-1.5" role={f.kind === "select" ? "radiogroup" : "group"}>
          {f.options.map((opt) => {
            const on = picked.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                role={f.kind === "select" ? "radio" : "checkbox"}
                aria-checked={on}
                onClick={() => toggle(opt.id)}
                className={cn(
                  "h-8 rounded-lg border px-3 text-sm transition-colors",
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border text-text-secondary hover:border-foreground/30 hover:text-foreground",
                )}
              >
                {l(opt.label)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (f.kind === "longtext")
    return (
      <label className="flex flex-col gap-2">
        <Label field={f} />
        <ScalarInput field={f} value={value as string | undefined} onChange={(v) => patch({ [f.id]: v })} />
      </label>
    );

  return (
    <div className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
      <Label field={f} />
      {f.kind === "price" ? (
        <PriceInput field={f} src={src} patch={patch} />
      ) : f.kind === "duration" ? (
        <DurationInput field={f} src={src} patch={patch} />
      ) : (
        <ScalarInput field={f} value={value as string | number | undefined} onChange={(v) => patch({ [f.id]: v })} />
      )}
    </div>
  );
}


function PeriodSelect({ periods, value, onChange, label, qty, compact }: { periods: PeriodId[]; value: PeriodId; onChange: (p: PeriodId) => void; label: string; qty: number; compact?: boolean }) {
  const { locale } = useI18n();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as PeriodId)}
      aria-label={label}
      className={cn(inputClass, "w-auto min-w-0 flex-1 pr-7", compact && "h-9")}
    >
      {periods.map((p) => (
        <option key={p} value={p}>
          {qty > 1 ? periodForm(p, qty, locale) : periodName(p, locale)}
        </option>
      ))}
    </select>
  );
}

/**
 * «[3 000] сом за [1] [час ▾]»: the amount, then for how many periods and which —
 * «45 000 за 4 часа», «25 000 за день», «2 500 за гостя».
 */
function PriceInput({ field: f, src, patch, compact }: { field: PriceField; src: Rec; patch: Patch; compact?: boolean }) {
  const { t, l } = useI18n();
  const amount = src[f.id] as number | undefined;
  const qty = (src[`${f.id}Qty`] as number | undefined) ?? 1;
  const per = (src[`${f.id}Per`] as PeriodId | undefined) ?? f.periods[0];
  // period and count are kept even before an amount is typed (sanitizeSpecs drops them if no amount follows)
  const set = (p: { amount?: number; qty?: number; per?: PeriodId }) => {
    const a = "amount" in p ? p.amount : amount;
    const q = p.qty ?? qty;
    patch({ [f.id]: a, [`${f.id}Per`]: p.per ?? per, [`${f.id}Qty`]: q > 1 ? q : undefined });
  };
  const h = compact ? "h-9" : "h-10";
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="relative flex min-w-0 flex-[2] items-center">
        <NumberInput
          value={amount}
          onChange={(n) => set({ amount: n })}
          placeholder={f.placeholder}
          aria-label={l(f.label)}
          className={cn(inputClass, h, "pr-10 tabular-nums")}
        />
        <span className="pointer-events-none absolute right-3 text-xs text-muted-foreground">{t("specs.som")}</span>
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">{t("specs.per")}</span>
      <NumberInput
        value={qty}
        empty={1}
        decimal={false}
        onChange={(n) => set({ qty: Math.max(1, n ?? 1) })}
        placeholder="1"
        aria-label={t("specs.qty")}
        title={t("specs.qtyHint")}
        className={cn(inputClass, h, "w-11 shrink-0 px-1.5 text-center tabular-nums")}
      />
      <span className="flex min-w-0 flex-[1.5]">
        <PeriodSelect periods={f.periods} value={per} qty={qty} onChange={(p) => set({ per: p })} label={t("specs.period")} compact={compact} />
      </span>
    </span>
  );
}

function DurationInput({ field: f, src, patch }: { field: DurationField; src: Rec; patch: Patch }) {
  const { t, l, locale } = useI18n();
  const qty = src[f.id] as number | undefined;
  const per = (src[`${f.id}Per`] as PeriodId | undefined) ?? f.periods[0];
  return (
    <span className="flex items-center gap-1.5">
      <NumberInput
        value={qty}
        decimal={false}
        onChange={(q) => patch({ [f.id]: q || undefined, [`${f.id}Per`]: per })}
        placeholder={f.placeholder}
        aria-label={l(f.label)}
        className={cn(inputClass, "w-20 tabular-nums")}
      />
      {f.periods.length > 1 ? (
        <PeriodSelect periods={f.periods} value={per} qty={qty ?? 5} onChange={(p) => patch({ [`${f.id}Per`]: p })} label={t("specs.period")} />
      ) : (
        <span className="text-sm text-muted-foreground">{periodForm(per, qty ?? 5, locale)}</span>
      )}
    </span>
  );
}

function ScalarInput({
  field: f,
  value,
  onChange,
  compact,
}: {
  field: Exclude<ItemField, PriceField>;
  value: string | number | undefined;
  onChange: (v: string | number | undefined) => void;
  compact?: boolean;
}) {
  const { l } = useI18n();
  if (f.kind === "select")
    return (
      <select value={value === undefined ? "" : String(value)} onChange={(e) => onChange(e.target.value || undefined)} className={cn(inputClass, compact && "h-9")} aria-label={l(f.label)}>
        <option value="">—</option>
        {f.options.map((o) => (
          <option key={o.id} value={o.id}>
            {l(o.label)}
          </option>
        ))}
      </select>
    );
  if (f.kind === "longtext")
    return (
      <textarea
        value={value === undefined ? "" : String(value)}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder={f.placeholder ? l(f.placeholder) : undefined}
        rows={4}
        maxLength={1500}
        aria-label={l(f.label)}
        className={textareaClass}
      />
    );
  if (f.kind === "text")
    return (
      <input
        value={value === undefined ? "" : String(value)}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder={f.placeholder ? l(f.placeholder) : undefined}
        maxLength={80}
        aria-label={l(f.label)}
        className={cn(inputClass, compact && "h-9")}
      />
    );
  return (
    <span className="relative flex items-center">
      <NumberInput
        value={typeof value === "number" ? value : undefined}
        onChange={onChange}
        placeholder={f.placeholder}
        aria-label={l(f.label)}
        className={cn(inputClass, "tabular-nums", f.unit && "pr-16", compact && "h-9")}
      />
      {f.unit && <span className="pointer-events-none absolute right-3 text-xs text-muted-foreground">{l(f.unit)}</span>}
    </span>
  );
}

function ListEditor({ field: f, rows, onChange }: { field: ListField; rows: SpecItem[]; onChange: (v: SpecItem[] | undefined) => void }) {
  const { l, t } = useI18n();
  const patchRow =
    (i: number): Patch =>
    (p) =>
      onChange(
        rows.map((r, k) => {
          if (k !== i) return r;
          const next: Rec = { ...r };
          for (const [key, v] of Object.entries(p)) {
            if (v === undefined || v === "") delete next[key];
            else next[key] = v;
          }
          return next as SpecItem;
        }),
      );
  const remove = (i: number) => {
    const next = rows.filter((_, k) => k !== i);
    onChange(next.length ? next : undefined);
  };
  const total = listTotal(f, rows);
  // title, price and long text take the whole row
  const wide = (it: ItemField) => it.id === f.titleField || it.kind === "price" || it.kind === "longtext";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <Label field={f} />
        {rows.length > 0 && f.short && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{l(fill(f.short, total))}</span>}
      </div>
      {rows.map((row, i) => (
        <div key={i} className="relative rounded-xl bg-card p-3 pr-10">
          <div className="grid gap-x-3 gap-y-2.5 sm:grid-cols-2">
            {f.item.map((it) => (
              <label key={it.id} className={cn("flex min-w-0 flex-col gap-1", wide(it) && "sm:col-span-2")}>
                <span className="text-xs text-muted-foreground">{l(it.label)}</span>
                {it.kind === "price" ? (
                  <PriceInput field={it} src={row} patch={patchRow(i)} compact />
                ) : (
                  <ScalarInput field={it} value={row[it.id]} onChange={(v) => patchRow(i)({ [it.id]: v })} compact />
                )}
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            aria-label={t("common.delete")}
            className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, {}])}
        className="flex h-10 items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-text-secondary transition-colors hover:border-primary hover:text-primary"
      >
        <Plus className="size-4" />
        {l(f.add)}
      </button>
    </div>
  );
}
