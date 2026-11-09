"use client";

import { format } from "date-fns";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { InvitationSheet } from "@/components/invitation/invitation-sheet";
import { PageHeader, Segmented } from "@/components/panel";
import { createInvitation } from "@/lib/data/actions";
import { INVITATION_TEMPLATES, OCCASIONS, draftFromTemplate, type InvitationTemplate } from "@/lib/data/invitation-templates";
import { useDB } from "@/lib/data/store";
import type { InvitationOccasion } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";

export default function InvitationsPage() {
  const { t, l, locale } = useI18n();
  const actor = useActor();
  const router = useRouter();
  const [occasion, setOccasion] = useState<InvitationOccasion | "all">("all");
  const today = format(new Date(), "yyyy-MM-dd");
  const mine = useDB((db) =>
    db.invitations.filter((i) => i.ownerId === actor.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );
  const event = useDB((db) =>
    db.events.filter((e) => e.clientId === actor.id && e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0],
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

  const templates = INVITATION_TEMPLATES.filter((tpl) => occasion === "all" || tpl.occasion === occasion);

  return (
    <div className="container-app pt-8 pb-16 md:pt-12">
      <PageHeader title={t("invitations.title")} subtitle={t("invitations.subtitle")} />

      {/* Mine */}
      <section className="mt-10">
        <h2 className="text-base font-medium">{t("invitations.mine")}</h2>
        <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          <li>
            <button
              type="button"
              onClick={() => start()}
              className="group flex aspect-[5/7] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card text-sm text-text-secondary transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <span className="flex size-10 items-center justify-center rounded-full border border-border transition-colors group-hover:border-primary/40 group-hover:text-primary">
                <Plus className="size-4" strokeWidth={1.5} />
              </span>
              {t("invitations.blank")}
            </button>
          </li>
          {mine.map((inv) => {
            const coming = inv.rsvps.filter((r) => r.attending).reduce((s, r) => s + r.guests, 0);
            return (
              <li key={inv.id}>
                <Link href={`/invitations/${inv.id}`} className="group block">
                  <InvitationSheet data={inv} className="transition-transform duration-200 group-hover:-translate-y-0.5" />
                  <p className="mt-3 truncate text-sm">{inv.names || t(`invitations.occasions.${inv.occasion}`)}</p>
                  <p className="mt-0.5 text-xs text-text-secondary tabular-nums">
                    {t(`invitations.occasions.${inv.occasion}`)} · {t("invitations.coming", { n: coming })}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
        {mine.length === 0 && <p className="mt-4 text-sm text-text-secondary">{t("invitations.empty")}</p>}
      </section>

      {/* Templates */}
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
          {templates.map((tpl) => (
            <li key={tpl.id}>
              <button type="button" onClick={() => start(tpl)} className="group block w-full text-left">
                <InvitationSheet
                  data={{ ...draftFromTemplate(tpl, locale, event), venue: "", address: "" }}
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
          ))}
        </ul>
      </section>
    </div>
  );
}
