"use client";

import { eachDayOfInterval, format, subDays } from "date-fns";
import { Download } from "lucide-react";
import { BarChart, Funnel } from "@/components/charts/charts";
import { Kpi } from "@/components/layout/cabinet-shell";
import { Empty, Section } from "@/components/panel";
import { Button } from "@/components/ui/button";
import type { Invitation } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { guestStatus, guestsCsv, invitationStats, type GuestStatus } from "@/lib/invitations/design";
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
        <Kpi label={t("inv.kSent")} value={`${num(s.sent)}/${num(s.guests)}`} />
        <Kpi label={t("inv.kOpened")} value={num(s.opened)} note={s.sent ? `${Math.round((s.opened / s.sent) * 100)}%` : undefined} />
        <Kpi label={t("inv.kComing")} value={num(s.coming)} tone="primary" />
        <Kpi label={t("inv.kDeclined")} value={num(s.declined)} />
        <Kpi label={t("inv.kWaiting")} value={num(s.waiting)} tone="gold" />
        <Kpi label={t("inv.kPersons")} value={num(s.persons)} note={t("inv.kViews", { n: num(s.views) })} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={t("inv.funnel")}>
          <Funnel
            steps={[
              { label: t("inv.fGuests"), value: s.guests },
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

      <Section
        title={t("inv.answers")}
        action={
          <Button variant="outline" className="h-9 px-3" onClick={exportCsv}>
            <Download />
            CSV
          </Button>
        }
      >
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
