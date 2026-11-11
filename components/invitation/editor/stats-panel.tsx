"use client";

import { eachDayOfInterval, format, subDays } from "date-fns";
import { Download, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { BarChart, Funnel } from "@/components/charts/charts";
import { Kpi } from "@/components/layout/cabinet-shell";
import { Empty, Field, Section, inputClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { addGuests, removeGuest } from "@/lib/data/actions";
import type { Invitation } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { guestStatus, guestsCsv, invitationStats, rsvpOfGuest, type GuestStatus } from "@/lib/invitations/design";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";
import { STATUS_TONE } from "./guests-panel";

export function StatsPanel({ inv }: { inv: Invitation }) {
  const { t, num, date } = useI18n();
  const s = invitationStats(inv);
  const days = eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() });
  const byDay = (items: { at: string }[]) =>
    days.map((d) => ({ key: format(d, "yyyy-MM-dd"), n: items.filter((x) => x.at.slice(0, 10) === format(d, "yyyy-MM-dd")).length }));
  const views = byDay(inv.views);
  const answers = byDay(inv.rsvps.map((r) => ({ at: r.createdAt })));
  const groups = Array.from(new Set(inv.guests.map((g) => g.group ?? "—")));
  const labels: Record<GuestStatus, string> = {
    draft: t("inv.status.draft"),
    sent: t("inv.status.sent"),
    opened: t("inv.status.opened"),
    coming: t("inv.status.coming"),
    declined: t("inv.status.declined"),
  };

  function exportCsv() {
    const blob = new Blob([guestsCsv(inv, labels)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `guests-${inv.id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={t("inv.kSent")} value={`${num(s.sent)}/${num(s.invited)}`} />
        <Kpi label={t("inv.kOpened")} value={num(s.opened)} note={s.sent ? `${Math.round((s.opened / s.sent) * 100)}%` : undefined} />
        <Kpi label={t("inv.kComing")} value={num(s.coming)} tone="primary" />
        <Kpi label={t("inv.kDeclined")} value={num(s.declined)} />
        <Kpi label={t("inv.kWaiting")} value={num(s.waiting)} tone="gold" />
        <Kpi label={t("inv.kPersons")} value={num(s.persons)} note={t("inv.kViews", { n: num(s.views) })} />
      </div>

      <GuestList inv={inv} labels={labels} onExport={exportCsv} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={t("inv.funnel")}>
          <Funnel
            steps={[
              { label: t("inv.fGuests"), value: s.invited },
              { label: t("inv.kSent"), value: s.sent },
              { label: t("inv.kOpened"), value: s.opened },
              { label: t("inv.fAnswered"), value: inv.rsvps.filter((r) => r.guestId).length },
              { label: t("inv.kComing"), value: inv.rsvps.filter((r) => r.guestId && r.attending).length },
            ]}
            format={num}
          />
          <p className="mt-4 text-xs text-muted-foreground">{t("inv.funnelHint")}</p>
        </Section>
        <Section title={t("inv.viewsByDay")}>
          <BarChart
            data={views.map((d) => ({ label: date(d.key, "d"), hint: date(d.key, "d MMMM"), value: d.n }))}
            height={150}
            highlightLast
          />
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={t("inv.answersByDay")}>
          <BarChart data={answers.map((d) => ({ label: date(d.key, "d"), hint: date(d.key, "d MMMM"), value: d.n }))} height={120} />
        </Section>
        <Section title={t("inv.byGroup")}>
          {groups.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-normal">{t("inv.group")}</th>
                  <th className="pb-2 text-right font-normal">{t("inv.fGuests")}</th>
                  <th className="pb-2 text-right font-normal">{t("inv.kComing")}</th>
                  <th className="pb-2 text-right font-normal">{t("inv.kWaiting")}</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const list = inv.guests.filter((x) => (x.group ?? "—") === g);
                  const st = list.map((x) => guestStatus(inv, x));
                  return (
                    <tr key={g} className="border-t border-border">
                      <td className="py-2">{g}</td>
                      <td className="py-2 text-right tabular-nums">{list.length}</td>
                      <td className="py-2 text-right tabular-nums">{st.filter((x) => x === "coming").length}</td>
                      <td className="py-2 text-right tabular-nums">{st.filter((x) => x !== "coming" && x !== "declined").length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <Empty>{t("inv.noGuests")}</Empty>
          )}
        </Section>
      </div>

      <Section title={t("inv.answers")}>
        {inv.rsvps.length ? (
          <ul className="flex flex-col divide-y divide-border">
            {[...inv.rsvps]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((r) => (
                <li key={r.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", r.attending ? STATUS_TONE.coming : STATUS_TONE.declined)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                      <span className="font-medium">
                        {r.name}
                        {!r.guestId && <span className="ml-2 text-xs font-normal text-muted-foreground">{t("inv.viaCommon")}</span>}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">{date(r.createdAt.slice(0, 10), "d MMM")}</span>
                    </div>
                    <div className="text-xs text-text-secondary">
                      {r.attending ? t("invitations.coming", { n: r.guests }) : t("inv.status.declined")}
                    </div>
                    {r.note && <p className="mt-1 text-sm text-text-secondary">«{r.note}»</p>}
                  </div>
                </li>
              ))}
          </ul>
        ) : (
          <Empty>{t("inv.noAnswers")}</Empty>
        )}
      </Section>
    </div>
  );
}

type Row = {
  key: string;
  name: string;
  sub?: string;
  group?: string;
  persons: number;
  status: GuestStatus;
  /** set for guests the host can remove from here (added without an invitation) */
  directId?: string;
};

const ORDER: GuestStatus[] = ["coming", "opened", "sent", "draft", "declined"];

/** Everyone in one place: invited guests, answers through the common link, and guests added without an invitation */
function GuestList({ inv, labels, onExport }: { inv: Invitation; labels: Record<GuestStatus, string>; onExport: () => void }) {
  const { t, num } = useI18n();
  const actor = useActor();
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<GuestStatus | "all">("all");
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [seats, setSeats] = useState(1);

  const rows: Row[] = [
    ...inv.guests.map((g): Row => {
      const r = rsvpOfGuest(inv, g.id);
      return {
        key: g.id,
        name: g.name,
        sub: g.direct ? t("inv.direct") : r?.note ? `«${r.note}»` : undefined,
        group: g.group,
        persons: r ? r.guests : g.seats,
        status: guestStatus(inv, g),
        directId: g.direct ? g.id : undefined,
      };
    }),
    ...inv.rsvps
      .filter((r) => !r.guestId)
      .map(
        (r): Row => ({
          key: r.id,
          name: r.name,
          sub: r.note ? `«${r.note}»` : t("inv.viaCommon"),
          persons: r.guests,
          status: r.attending ? "coming" : "declined",
        }),
      ),
  ].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.name.localeCompare(b.name));
  const shown = rows.filter((r) => filter === "all" || r.status === filter);
  const count = (s: GuestStatus) => rows.filter((r) => r.status === s).length;
  const groups = Array.from(new Set(inv.guests.map((g) => g.group).filter(Boolean))) as string[];

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addGuests(actor, inv.id, [{ name, group: group || undefined, seats, direct: true }]);
    setName("");
    setSeats(1);
  }

  return (
    <Section
      title={t("inv.guestList")}
      action={
        <div className="flex gap-2">
          <Button variant="outline" className="h-9 px-3" onClick={onExport}>
            <Download />
            CSV
          </Button>
          <Button variant={adding ? "outline" : "default"} className="h-9 px-3" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
            <Plus />
            <span className="max-sm:hidden">{t("inv.addDirect")}</span>
            <span className="sm:hidden">{t("common.add")}</span>
          </Button>
        </div>
      }
    >
      {adding && (
        <form onSubmit={add} className="mb-5 rounded-xl border border-border bg-muted/40 p-4">
          <p className="mb-3 text-xs leading-relaxed text-text-secondary">{t("inv.addDirectHint")}</p>
          <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_96px_auto] sm:items-end">
            <Field label={t("inv.guestName")}>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} maxLength={80} autoFocus />
            </Field>
            <Field label={t("inv.group")}>
              <input
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className={inputClass}
                list="stats-guest-groups"
                placeholder={t("inv.groupPlaceholder")}
              />
              <datalist id="stats-guest-groups">
                {groups.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </Field>
            <Field label={t("inv.persons")}>
              <input
                type="number"
                min={1}
                max={10}
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Button type="submit" className="h-10 px-4" disabled={!name.trim()}>
              {t("common.add")}
            </Button>
          </div>
        </form>
      )}

      {rows.length ? (
        <>
          <div className="no-scrollbar -mx-1 mb-3 flex gap-1 overflow-x-auto px-1">
            {(["all", ...ORDER] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={filter === s}
                onClick={() => setFilter(s)}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm",
                  filter === s ? "border-primary bg-secondary text-secondary-foreground" : "border-border text-text-secondary hover:bg-muted",
                )}
              >
                {s !== "all" && <span className={cn("size-1.5 rounded-full", STATUS_TONE[s])} />}
                {s === "all" ? t("inv.status.all") : labels[s]}
                <span className="text-xs text-muted-foreground tabular-nums">{s === "all" ? rows.length : count(s)}</span>
              </button>
            ))}
          </div>
          <ul className="flex max-h-[420px] flex-col divide-y divide-border overflow-y-auto">
            {shown.map((r) => (
              <li key={r.key} className="flex items-center gap-3 py-2.5">
                <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_TONE[r.status])} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{r.name}</div>
                  {(r.sub || r.group) && (
                    <div className="truncate text-xs text-muted-foreground">{[r.group, r.sub].filter(Boolean).join(" · ")}</div>
                  )}
                </div>
                <span className="shrink-0 text-xs text-text-secondary">{labels[r.status]}</span>
                <span className="w-8 shrink-0 text-right text-sm tabular-nums" title={t("inv.persons")}>
                  {r.status === "declined" ? "—" : num(r.persons)}
                </span>
                <span className="flex w-7 shrink-0 justify-end">
                  {r.directId && (
                    <button
                      type="button"
                      onClick={() => removeGuest(actor, inv.id, r.directId!)}
                      aria-label={t("inv.delete")}
                      title={t("inv.delete")}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Trash2 className="size-3.5" strokeWidth={1.75} />
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {shown.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t("inv.noneInStatus")}</p>}
        </>
      ) : (
        <Empty>{t("inv.noGuests")}</Empty>
      )}
    </Section>
  );
}
