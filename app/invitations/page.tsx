"use client";

import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateInvitationDialog } from "@/components/invitation/create-dialog";
import { BUCKET_COLOR, DonutLegend, Reveal, RsvpDonut, bucketSlices } from "@/components/invitation/rsvp-donut";
import { InvitationThumb } from "@/components/invitation/thumb";
import { PageHeader } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { createInvitation } from "@/lib/data/actions";
import { draftFromTemplate, type InvitationTemplate } from "@/lib/data/invitation-templates";
import { useMyInvitations, useNextEvent } from "@/lib/data/views/client";
import { track } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";
import { guestRows, invitationStats, type RsvpBucket } from "@/lib/invitations/design";
import { useActor } from "@/lib/session";
import { routes } from "@/lib/routes";
import { useAction } from "@/lib/data/use-action";

export default function InvitationsPage() {
  const { t, tn, locale, num } = useI18n();
  const actor = useActor();
  const router = useRouter();
  const { run, pending } = useAction();
  const [creating, setCreating] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const mine = useMyInvitations(actor.id);
  const event = useNextEvent(actor.id);

  if (actor.role !== "client") {
    return (
      <div className="mx-auto flex max-w-sm flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center text-sm text-text-secondary">
        {t("vendor.onlyClients")}
      </div>
    );
  }

  async function start(tpl?: InvitationTemplate) {
    const inv = await run(() => createInvitation(draftFromTemplate(tpl, locale, event)));
    if (inv) {
      track("invitation_created", { from: tpl ? "template" : "scratch" });
      router.push(routes.invitation(inv.id));
    }
  }

  // every guest of every invitation, tagged with the invitation they belong to
  const rows = mine.flatMap((inv) => guestRows(inv).map((r) => ({ ...r, inv })));
  const slices = bucketSlices(rows, t);
  const persons = mine.reduce((s, inv) => s + invitationStats(inv).persons, 0);
  const people = picked ? rows.filter((r) => r.bucket === picked) : [];

  return (
    <div className="container-app pt-8 pb-16 md:pt-12">
      <PageHeader
        title={t("invitations.title")}
        subtitle={t("inv.listHint")}
        action={
          <Button variant="sun" className="h-11 px-5" onClick={() => setCreating(true)}>
            <Plus strokeWidth={2} />
            {t("inv.create")}
          </Button>
        }
      />

      {/* answers across all invitations: one ring, tap a slice to see who */}
      <section className="mt-8 rounded-[28px] bg-card p-5 md:p-8">
        {rows.length ? (
          <>
            <div className="grid items-center gap-6 md:grid-cols-[260px_minmax(0,1fr)] md:gap-12">
              <RsvpDonut
                slices={slices}
                selected={picked}
                onSelect={setPicked}
                center={{ value: num(rows.length), label: tn("inv.guestsN", rows.length) }}
              />
              <div className="min-w-0">
                <h2 className="display text-2xl md:text-[28px]">{t("inv.answersTitle")}</h2>
                <p className="mt-1 text-sm text-text-secondary">{t("inv.personsComing", { n: num(persons) })}</p>
                <DonutLegend slices={slices} selected={picked} onSelect={setPicked} className="mt-5 max-w-md" />
                <p className="mt-3 text-xs text-muted-foreground">{t("inv.answersHint")}</p>
              </div>
            </div>
            <Reveal open={!!picked}>
              <ul className="mt-6 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {people.map((r) => (
                  <li key={`${r.inv.id}-${r.key}`}>
                    <Link
                      href={routes.invitation(r.inv.id, "stats")}
                      className="flex items-center gap-3 rounded-2xl bg-background px-4 py-3 transition-colors hover:bg-cream"
                    >
                      <span className="size-2 shrink-0 rounded-full" style={{ background: BUCKET_COLOR[r.bucket as RsvpBucket] }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{r.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {t("inv.inInvitation", { name: r.inv.names || t(`invitations.occasions.${r.inv.occasion}`) })}
                          {r.note && ` · «${r.note}»`}
                        </span>
                      </span>
                      {r.bucket !== "declined" && <span className="text-sm tabular-nums text-text-secondary">{r.persons}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          </>
        ) : (
          <div className="grid items-center gap-6 md:grid-cols-[260px_minmax(0,1fr)] md:gap-12">
            <RsvpDonut
              slices={slices}
              selected={null}
              onSelect={() => {}}
              center={{ value: "0", label: "" }}
              empty={<span className="text-xs leading-snug text-muted-foreground">{t("inv.emptyRing")}</span>}
            />
            <div className="max-md:text-center">
              <h2 className="display text-2xl md:text-[30px]">{t("inv.emptyTitle")}</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary max-md:mx-auto">{t("inv.emptyText")}</p>
              <Button variant="sun" className="mt-5 h-11 px-5" onClick={() => setCreating(true)}>
                <Plus strokeWidth={2} />
                {t("inv.createTitle")}
              </Button>
            </div>
          </div>
        )}
      </section>

      {mine.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-medium">{t("invitations.mine")}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            <li>
              <button
                type="button"
                onClick={() => setCreating(true)}
                aria-label={t("inv.createTitle")}
                className="group flex aspect-[5/7] w-full flex-col items-center justify-center gap-3 rounded-xl bg-cream text-sm text-text-secondary transition-colors hover:text-foreground"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-card transition-transform duration-200 group-hover:scale-110 group-hover:text-primary">
                  <Plus className="size-5" strokeWidth={1.75} />
                </span>
                {t("inv.create")}
              </button>
            </li>
            {mine.map((inv) => {
              const s = invitationStats(inv);
              return (
                <li key={inv.id}>
                  <Link href={routes.invitation(inv.id)} className="group block">
                    <InvitationThumb inv={inv} className="transition-transform duration-200 group-hover:-translate-y-0.5" />
                    <p className="mt-3 flex items-center gap-1 truncate text-sm">
                      <span className="truncate">{inv.names || t(`invitations.occasions.${inv.occasion}`)}</span>
                      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </p>
                    <p className="mt-0.5 text-xs text-text-secondary tabular-nums">
                      {t("inv.cardStats", { sent: s.sent, coming: s.persons, waiting: s.waiting })}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <CreateInvitationDialog open={creating} onOpenChange={setCreating} onCreate={(tpl) => void start(tpl)} event={event} busy={pending} />
    </div>
  );
}
