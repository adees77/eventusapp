"use client";

import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/brand/logo";
import { InvitationSheet } from "@/components/invitation/invitation-sheet";
import { Field, inputClass, textareaClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { submitRsvp } from "@/lib/data/actions";
import { useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Public guest page: the invitation and a reply form. No app navigation. */
export default function GuestInvitationPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const inv = useDB((db) => db.invitations.find((i) => i.id === id));

  const found = !!inv;
  useEffect(() => {
    if (!found || new URLSearchParams(window.location.search).get("print") !== "1") return;
    const timer = setTimeout(() => window.print(), 600); // let fonts and the photo settle
    return () => clearTimeout(timer);
  }, [found]);

  if (!inv) {
    return (
      <div className="m-auto flex max-w-sm flex-col items-center gap-3 px-4 py-24 text-center">
        <LogoMark className="h-6 w-auto opacity-70" />
        <p className="mt-4 font-serif text-2xl">{t("invitations.notFound")}</p>
        <p className="text-sm text-text-secondary">{t("invitations.notFoundHint")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-muted/40 px-4 py-10 md:py-16 print:bg-white print:p-0">
      <div className="w-full max-w-[460px] animate-rise print:max-w-none">
        <InvitationSheet data={inv} className="print:rounded-none print:shadow-none" />
      </div>

      <div className="w-full max-w-[460px] print:hidden">
        <RsvpForm invitationId={inv.id} contact={inv.contact} />
        <Link href="/" className="mt-10 flex justify-center opacity-60 transition-opacity hover:opacity-100" aria-label="EVENTUS">
          <LogoMark className="h-4 w-auto" />
        </Link>
      </div>
    </div>
  );
}

function RsvpForm({ invitationId, contact }: { invitationId: string; contact?: string }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [attending, setAttending] = useState<boolean | null>(null);
  const [guests, setGuests] = useState(1);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
        <p className="font-serif text-2xl">{t("invitations.rsvp.thanks")}</p>
        <button type="button" onClick={() => setSent(false)} className="mt-3 text-sm text-primary">
          {t("invitations.rsvp.change")}
        </button>
      </div>
    );
  }

  const valid = name.trim().length > 1 && attending !== null;

  return (
    <form
      className="mt-8 rounded-2xl border border-border bg-card p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        submitRsvp(invitationId, { name, attending: attending!, guests, note });
        setSent(true);
      }}
    >
      <h2 className="text-center font-serif text-3xl font-normal">{t("invitations.rsvp.title")}</h2>

      <div className="mt-6 grid grid-cols-2 gap-2" role="radiogroup">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={attending === v}
            onClick={() => setAttending(v)}
            className={cn(
              "h-11 rounded-lg border text-sm transition-colors",
              attending === v ? "border-primary bg-primary/[0.06] text-primary" : "border-border text-text-secondary hover:bg-muted hover:text-foreground",
            )}
          >
            {v ? t("invitations.rsvp.yes") : t("invitations.rsvp.no")}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4">
        <Field label={t("invitations.rsvp.name")}>
          <input className={inputClass} value={name} maxLength={80} autoComplete="name" onChange={(e) => setName(e.target.value)} />
        </Field>
        {attending && (
          <Field label={t("invitations.rsvp.guests")}>
            <div className="flex h-10 items-center gap-1 self-start rounded-lg border border-input">
              <button type="button" className="flex size-10 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40" onClick={() => setGuests((g) => Math.max(1, g - 1))} disabled={guests <= 1} aria-label="−">
                <Minus className="size-4" strokeWidth={1.5} />
              </button>
              <span className="w-8 text-center text-sm tabular-nums">{guests}</span>
              <button type="button" className="flex size-10 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40" onClick={() => setGuests((g) => Math.min(10, g + 1))} disabled={guests >= 10} aria-label="+">
                <Plus className="size-4" strokeWidth={1.5} />
              </button>
            </div>
          </Field>
        )}
        <Field label={t("invitations.rsvp.note")}>
          <textarea className={textareaClass} rows={2} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>

      <Button type="submit" disabled={!valid} className="mt-6 h-11 w-full">
        {t("invitations.rsvp.submit")}
      </Button>
      {contact && <p className="mt-4 text-center text-xs text-text-secondary">{t("invitations.rsvp.contact", { contact })}</p>}
    </form>
  );
}
