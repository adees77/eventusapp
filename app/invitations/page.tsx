"use client";

import { format } from "date-fns";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { InvitationThumb } from "@/components/invitation/thumb";
import { Kpi } from "@/components/layout/cabinet-shell";
import { PageHeader, Segmented } from "@/components/panel";
import { createInvitation } from "@/lib/data/actions";
import { INVITATION_TEMPLATES, OCCASIONS, draftFromTemplate, type InvitationTemplate } from "@/lib/data/invitation-templates";
import { useDB } from "@/lib/data/store";
import type { InvitationOccasion } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { invitationStats } from "@/lib/invitations/design";
import { useActor } from "@/lib/session";

export default function InvitationsPage() {
  const { t, l, locale, num } = useI18n();
  const actor = useActor();
  const router = useRouter();
  const [occasion, setOccasion] = useState<InvitationOccasion | "all">("all");
  const today = format(new Date(), "yyyy-MM-dd");
  const mine = useDB((db) => db.invitations.filter((i) => i.ownerId === actor.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  const event = useDB(
    (db) => db.events.filter((e) => e.clientId === actor.id && e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0],
  );

  if (actor.role !== "client") {
    return (
      <div className="mx-auto flex max-w-sm flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center text-sm text-text-secondary">
        {t("vendor.onlyClients")}
      </div>
    );
  }

  function start(tpl?: InvitationTemplate) {
    const inv = createInvitation(actor, draftFromTemplate(tpl, locale, event));
    router.push(`/invitations/${inv.id}`);
  }

  const all = mine.map(invitationStats);
  const sum = (k: keyof (typeof all)[number]) => all.reduce((s, x) => s + x[k], 0);
  const templates = INVITATION_TEMPLATES.filter((tpl) => occasion === "all" || tpl.occasion === occasion);

  return (
    <div className="container-app pt-8 pb-16 md:pt-12">
      <PageHeader title={t("invitations.title")} subtitle={t("inv.listHint")} />

      {mine.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi label={t("inv.kSent")} value={num(sum("sent"))} note={t("inv.ofGuests", { n: num(sum("guests")) })} />
          <Kpi label={t("inv.kOpened")} value={num(sum("opened"))} />
          <Kpi label={t("inv.kComing")} value={num(sum("coming"))} tone="primary" />
          <Kpi label={t("inv.kDeclined")} value={num(sum("declined"))} />
          <Kpi label={t("inv.kWaiting")} value={num(sum("waiting"))} tone="gold" />
          <Kpi label={t("inv.kPersons")} value={num(sum("persons"))} note={t("inv.kViews", { n: num(sum("views")) })} />
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-base font-medium">{t("invitations.mine")}</h2>
        <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          <li>
            <button
              type="button"
              onClick={() => start()}
              className="group flex aspect-[5/7] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card text-sm text-text-secondary transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <span className="flex size-10 items-center justify-center rounded-full transition-colors group-hover:border-primary/40 group-hover:text-primary bg-foreground/[0.045]">
                <Plus className="size-4" strokeWidth={1.5} />
              </span>
              {t("invitations.blank")}
            </button>
          </li>
          {mine.map((inv, i) => {
            const s = all[i];
            return (
              <li key={inv.id}>
                <Link href={`/invitations/${inv.id}`} className="group block">
                  <InvitationThumb inv={inv} className="transition-transform duration-200 group-hover:-translate-y-0.5" />
                  <p className="mt-3 truncate text-sm">{inv.names || t(`invitations.occasions.${inv.occasion}`)}</p>
                  <p className="mt-0.5 text-xs text-text-secondary tabular-nums">
                    {t("inv.cardStats", { sent: s.sent, coming: s.persons, waiting: s.waiting })}
                  </p>
                  {s.guests > 0 && (
                    <span className="mt-2 flex h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <span className="bg-success" style={{ width: `${(s.coming / s.guests) * 100}%` }} />
                      <span className="bg-destructive/70" style={{ width: `${(s.declined / s.guests) * 100}%` }} />
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        {mine.length === 0 && <p className="mt-4 text-sm text-text-secondary">{t("invitations.empty")}</p>}
      </section>

      <section className="mt-14">
        <h2 className="text-base font-medium">{t("invitations.templates")}</h2>
        <div className="mt-2">
          <Segmented
            value={occasion}
            onChange={setOccasion}
            options={[
              { value: "all", label: t("invitations.allOccasions") },
              ...OCCASIONS.map((o) => ({ value: o, label: t(`invitations.occasions.${o}`) })),
            ]}
          />
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {templates.map((tpl) => {
            const d = draftFromTemplate(tpl, locale, event);
            return (
              <li key={tpl.id}>
                <button type="button" onClick={() => start(tpl)} className="group block w-full text-left">
                  <InvitationThumb
                    inv={{
                      id: tpl.id,
                      design: d.design,
                      date: d.date,
                      time: d.time,
                      venue: "",
                      address: "",
                      names: d.names,
                      contact: undefined,
                    }}
                    className="transition-transform duration-200 group-hover:-translate-y-0.5"
                  />
                  <div className="mt-3 flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm">{l(tpl.name)}</p>
                    <span className="shrink-0 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      {t("invitations.useTemplate")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-text-secondary">{t(`invitations.occasions.${tpl.occasion}`)}</p>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
