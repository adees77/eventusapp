"use client";

import { Check } from "lucide-react";
import { CATEGORY_SPECS, durationOf, fill, isFilled, type ItemField, type ListField, listTotal, priceOf, type SpecField } from "@/lib/data/specs";
import type { CategoryId, SpecItem, VendorSpecs } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";

type Rec = Record<string, unknown>;

/** Read-only details for clients: values, prices with their period, lists as tables, menus as cards */
export function SpecSheet({ category, specs }: { category: CategoryId; specs: VendorSpecs | undefined }) {
  const { l, num } = useI18n();
  const src = (specs ?? {}) as Rec;
  const groups = CATEGORY_SPECS[category]
    .map((g) => ({ ...g, fields: g.fields.filter((f) => isFilled(specs?.[f.id])) }))
    .filter((g) => g.fields.length);
  if (!groups.length) return null;

  /** One value as text; `from` is the record holding it (the specs or a list row) */
  const text = (f: SpecField | ItemField, from: Rec): string => {
    const v = from[f.id];
    if (f.kind === "price") return l(priceOf(from, f.id) ?? undefined) ?? "";
    if (f.kind === "duration") return l(durationOf(from, f.id) ?? undefined) ?? "";
    if (f.kind === "number") return `${num(Number(v))}${f.unit ? ` ${l(f.unit)}` : ""}`;
    if (f.kind === "select") return l(f.options.find((o) => o.id === v)?.label) ?? "";
    if (f.kind === "multi") return (v as string[]).flatMap((id) => l(f.options.find((o) => o.id === id)?.label) ?? []).join(", ");
    return String(v ?? "");
  };

  return (
    <div className="grid gap-x-12 gap-y-10 lg:grid-cols-2">
      {groups.map((g) => {
        const lists = g.fields.filter((f): f is ListField => f.kind === "list");
        const values = g.fields.filter((f) => f.kind !== "list" && f.kind !== "bool");
        const ticks = g.fields.filter((f) => f.kind === "bool");
        return (
          <section key={g.title.ru} className={lists.length ? "lg:col-span-2" : undefined}>
            <h3 className="mb-3 text-sm font-medium">{l(g.title)}</h3>

            {lists.map((f) => {
              const rows = src[f.id] as SpecItem[];
              const long = f.item.find((it) => it.kind === "longtext");
              if (long)
                return (
                  <ul key={f.id} className="mb-5 grid gap-3 md:grid-cols-2">
                    {rows.map((r, i) => (
                      <li key={i} className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-medium">{String(r[f.titleField] ?? "—")}</span>
                          {f.item
                            .filter((it) => it.kind === "price" && r[it.id] !== undefined)
                            .map((it) => (
                              <span key={it.id} className="shrink-0 text-sm tabular-nums">
                                {text(it, r)}
                              </span>
                            ))}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          {f.item
                            .filter((it) => it.id !== f.titleField && it.kind !== "price" && it.kind !== "longtext" && r[it.id] !== undefined)
                            .map((it) => (
                              <span key={it.id}>
                                {l(it.label)}: {text(it, r)}
                              </span>
                            ))}
                        </div>
                        {r[long.id] && <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-text-secondary">{String(r[long.id])}</p>}
                      </li>
                    ))}
                  </ul>
                );
              return (
                <div key={f.id} className="mb-5 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        {f.item.map((it) => (
                          <th key={it.id} className="py-2 pr-4 font-normal">
                            {l(it.label)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          {f.item.map((it) => (
                            <td key={it.id} className={it.id === f.titleField ? "py-2.5 pr-4" : "py-2.5 pr-4 text-text-secondary tabular-nums"}>
                              {r[it.id] === undefined || r[it.id] === "" ? "—" : text(it, r)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    {f.countField && f.short && (
                      <tfoot>
                        <tr className="text-xs text-muted-foreground">
                          <td className="pt-2" colSpan={f.item.length}>
                            {l(fill(f.short, listTotal(f, rows)))}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              );
            })}

            {values.length > 0 && (
              <dl className="flex flex-col">
                {values.map((f) =>
                  f.kind === "longtext" ? (
                    <div key={f.id} className="border-b border-border py-2.5 text-sm last:border-0">
                      <dt className="text-text-secondary">{l(f.label)}</dt>
                      <dd className="mt-1 whitespace-pre-line">{text(f, src)}</dd>
                    </div>
                  ) : (
                    <div key={f.id} className="flex items-baseline justify-between gap-6 border-b border-border py-2.5 text-sm last:border-0">
                      <dt className="shrink-0 text-text-secondary">{l(f.label)}</dt>
                      <dd className="text-right">{text(f, src)}</dd>
                    </div>
                  ),
                )}
              </dl>
            )}

            {ticks.length > 0 && (
              <ul className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {ticks.map((f) => (
                  <li key={f.id} className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-success" strokeWidth={2} />
                    {l(f.label)}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
