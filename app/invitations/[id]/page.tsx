"use client";

import { ArrowLeft, Copy, ExternalLink, Files, Printer, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DatePicker } from "@/components/date-picker";
import { InvitationSheet } from "@/components/invitation/invitation-sheet";
import { Empty, Field, Section, inputClass, textareaClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { deleteInvitation, duplicateInvitation, updateInvitation } from "@/lib/data/actions";
import { INVITATION_PHOTOS, STYLES } from "@/lib/data/invitation-templates";
import { can } from "@/lib/data/policies";
import { useDB } from "@/lib/data/store";
import type { Invitation } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

export default function InvitationEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { t, date } = useI18n();
  const actor = useActor();
  const router = useRouter();
  const inv = useDB((db) => db.invitations.find((i) => i.id === id));
  const events = useDB((db) => db.events.filter((e) => e.clientId === actor.id));
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!inv || !can.manageInvitation(actor, inv.ownerId)) {
    return (
      <div className="mx-auto flex max-w-sm flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
        <p className="font-serif text-2xl">{t("invitations.notFound")}</p>
        <Link href="/invitations" className="text-sm text-primary">
          {t("invitations.back")}
        </Link>
      </div>
    );
  }

  const set = (patch: Partial<Invitation>) => updateInvitation(actor, inv.id, patch);
  const guestUrl = `/i/${inv.id}`;
  const coming = inv.rsvps.filter((r) => r.attending);
  const declined = inv.rsvps.filter((r) => !r.attending);
  const totalGuests = coming.reduce((s, r) => s + r.guests, 0);
  const linkedEvent = events.find((e) => e.id === inv.eventId);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${guestUrl}`);
      toast.success(t("invitations.linkCopied"));
    } catch {
      toast(`${window.location.origin}${guestUrl}`);
    }
  }

  return (
    <div className="container-app pt-6 pb-16 md:pt-10">
      <Link href="/invitations" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-foreground">
        <ArrowLeft className="size-4" strokeWidth={1.5} />
        {t("invitations.back")}
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate font-serif text-4xl font-normal md:text-5xl">{inv.names || t(`invitations.occasions.${inv.occasion}`)}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {t(`invitations.occasions.${inv.occasion}`)} · {t("invitations.saved")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-10 px-4" onClick={copyLink}>
            <Copy />
            {t("invitations.copyLink")}
          </Button>
          <Button variant="outline" className="h-10 px-4" onClick={() => window.open(guestUrl, "_blank")}>
            <ExternalLink />
            {t("invitations.openGuest")}
          </Button>
          <Button variant="ghost" className="size-10 p-0" aria-label={t("invitations.print")} onClick={() => window.open(`${guestUrl}?print=1`, "_blank")}>
            <Printer />
          </Button>
          <Button
            variant="ghost"
            className="size-10 p-0"
            aria-label={t("invitations.duplicate")}
            onClick={() => {
              const copy = duplicateInvitation(actor, inv.id);
              if (copy) router.push(`/invitations/${copy.id}`);
            }}
          >
            <Files />
          </Button>
          <Button variant="ghost" className="size-10 p-0 text-muted-foreground hover:text-destructive" aria-label={t("invitations.delete")} onClick={() => setConfirmDelete(true)}>
            <Trash2 />
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px]">
        {/* Preview first on phones, sticky on the right on desktop */}
        <div className="lg:order-2">
          <div className="mx-auto max-w-[360px] lg:sticky lg:top-24 lg:max-w-none">
            <InvitationSheet data={inv} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-6 lg:order-1">
          <Section title={t("invitations.style")}>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set({ style: s, photo: s === "photo" ? (inv.photo ?? INVITATION_PHOTOS[0]) : inv.photo })}
                  aria-pressed={inv.style === s}
                  className="group flex flex-col items-center gap-2"
                >
                  <span
                    className={cn(
                      "block w-full rounded-lg p-1 ring-1 ring-transparent transition-shadow",
                      inv.style === s ? "ring-primary" : "group-hover:ring-border",
                    )}
                  >
                    <InvitationSheet data={{ ...inv, style: s, photo: inv.photo ?? INVITATION_PHOTOS[0] }} className="shadow-soft ring-1 ring-border" />
                  </span>
                  <span className={cn("text-xs", inv.style === s ? "text-foreground" : "text-text-secondary")}>{t(`invitations.styles.${s}`)}</span>
                </button>
              ))}
            </div>

            {inv.style === "photo" && (
              <div className="mt-6">
                <p className="text-sm text-text-secondary">{t("invitations.photoLabel")}</p>
                <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
                  {INVITATION_PHOTOS.map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => set({ photo: src })}
                      aria-pressed={inv.photo === src}
                      className={cn(
                        "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2 ring-offset-2 ring-offset-card transition-shadow",
                        inv.photo === src ? "ring-primary" : "ring-transparent hover:ring-border",
                      )}
                    >
                      <Image src={src} alt="" fill sizes="96px" className="object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Section>

          <Section title={t("invitations.text")}>
            <div className="grid gap-4">
              <Field label={t("invitations.fields.heading")}>
                <input className={inputClass} value={inv.heading} maxLength={60} onChange={(e) => set({ heading: e.target.value })} />
              </Field>
              <Field label={t("invitations.fields.names")}>
                <input className={inputClass} value={inv.names} maxLength={60} onChange={(e) => set({ names: e.target.value })} />
              </Field>
              <Field label={t("invitations.fields.message")}>
                <textarea className={textareaClass} rows={4} value={inv.message} maxLength={280} onChange={(e) => set({ message: e.target.value })} />
              </Field>
            </div>
          </Section>

          <Section title={t("invitations.details")}>
            <div className="grid gap-4 sm:grid-cols-2">
              {events.length > 0 && (
                <Field label={t("invitations.fields.event")}>
                  <NativeSelect
                    value={inv.eventId ?? ""}
                    onChange={(e) => {
                      const ev = events.find((x) => x.id === e.target.value);
                      set({ eventId: ev?.id, ...(ev ? { date: ev.date } : {}) });
                    }}
                  >
                    <option value="">{t("invitations.fields.noEvent")}</option>
                    {events.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              )}
              <Field label={t("invitations.fields.date")}>
                <div className="flex flex-col gap-1.5">
                  <DatePicker value={inv.date || null} onChange={(d) => set({ date: d ?? "" })} clearable={false} className="w-full" />
                  {linkedEvent && linkedEvent.date !== inv.date && (
                    <button type="button" onClick={() => set({ date: linkedEvent.date })} className="self-start text-xs text-primary">
                      {t("invitations.fromEvent")} · {date(linkedEvent.date, "d MMMM")}
                    </button>
                  )}
                </div>
              </Field>
              <Field label={t("invitations.fields.time")}>
                <input type="time" className={inputClass} value={inv.time} onChange={(e) => set({ time: e.target.value })} />
              </Field>
              <Field label={t("invitations.fields.venue")}>
                <input className={inputClass} value={inv.venue} maxLength={60} onChange={(e) => set({ venue: e.target.value })} />
              </Field>
              <Field label={t("invitations.fields.address")}>
                <input className={inputClass} value={inv.address} maxLength={80} onChange={(e) => set({ address: e.target.value })} />
              </Field>
              <Field label={t("invitations.fields.dressCode")}>
                <input className={inputClass} value={inv.dressCode ?? ""} maxLength={60} onChange={(e) => set({ dressCode: e.target.value || undefined })} />
              </Field>
              <Field label={t("invitations.fields.contact")}>
                <input type="tel" className={inputClass} value={inv.contact ?? ""} maxLength={30} onChange={(e) => set({ contact: e.target.value || undefined })} />
              </Field>
            </div>
          </Section>

          <Section
            title={t("invitations.rsvps")}
            action={
              inv.rsvps.length > 0 && <span className="text-sm text-text-secondary tabular-nums">{t("invitations.guestsTotal", { n: totalGuests })}</span>
            }
          >
            {inv.rsvps.length === 0 ? (
              <Empty>{t("invitations.noRsvps")}</Empty>
            ) : (
              <>
                <p className="text-sm text-text-secondary tabular-nums">
                  {t("invitations.coming", { n: coming.length })} · {t("invitations.notComing", { n: declined.length })}
                </p>
                <ul className="mt-3 flex flex-col divide-y divide-border">
                  {[...inv.rsvps].reverse().map((r) => (
                    <li key={r.id} className="flex items-start gap-3 py-3">
                      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", r.attending ? "bg-success" : "bg-muted-foreground/40")} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="truncate text-sm">{r.name}</p>
                          <span className="shrink-0 text-xs text-text-secondary tabular-nums">
                            {r.attending ? `${t("invitations.rsvp.yes")} · ${r.guests}` : t("invitations.rsvp.no")}
                          </span>
                        </div>
                        {r.note && <p className="mt-0.5 text-sm text-text-secondary">{r.note}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">{t("invitations.demoLink")}</p>
          </Section>
        </div>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("invitations.delete")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">{t("invitations.deleteConfirm")}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteInvitation(actor, inv.id);
                toast(t("invitations.deleted"));
                router.push("/invitations");
              }}
            >
              {t("invitations.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
