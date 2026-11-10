"use client";

import { ArrowLeft, Minus, Plus } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { AvailDots } from "@/components/avail-dots";
import { BookingSummary } from "@/components/booking/booking-summary";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { NativeSelect } from "@/components/ui/native-select";
import { AvailabilityCalendar } from "@/components/vendor/availability-calendar";
import { AvailabilityError, createBooking } from "@/lib/data/actions";
import { getAvailability } from "@/lib/data/availability";
import { offerById, vendorById } from "@/lib/data/queries";
import { useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { usePlanner } from "@/lib/planner";
import { useActor } from "@/lib/session";

export default function BookPage() {
  return (
    <Suspense>
      <Book />
    </Suspense>
  );
}

function Book() {
  const { offerId } = useParams<{ offerId: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { t, l, money } = useI18n();
  const actor = useActor();
  const planner = usePlanner();

  const db = useDB((d) => d);
  const offer = offerById(db, offerId);
  const vendor = offer ? vendorById(db, offer.vendorId) : undefined;
  const events = db.events.filter((e) => e.clientId === actor.id);

  const [date, setDateState] = useState<string | null>(params.get("date") ?? planner.date);
  const [qty, setQty] = useState(Math.max(1, Number(params.get("qty")) || 1));
  const [eventId, setEventId] = useState<string>(
    () => events.find((e) => e.date === (params.get("date") ?? planner.date))?.id ?? events[0]?.id ?? "",
  );
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!offer || !vendor || !offer.active) {
    return (
      <div className="mx-auto flex max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <p className="font-serif text-2xl">{t("vendor.notFound")}</p>
        <LinkButton href="/vendors" variant="outline">
          {t("nav.catalog")}
        </LinkButton>
      </div>
    );
  }

  const avail = date ? getAvailability(db, offer, date) : null;
  const maxQty = Math.max(1, Math.min(avail?.free ?? offer.totalUnits, offer.maxPerBooking ?? offer.totalUnits));
  const safeQty = Math.min(qty, maxQty);
  const total = offer.price * safeQty;
  const prepay = Math.round((total * vendor.prepayPercent) / 100);
  const isClient = actor.role === "client";
  const canPay = isClient && !!date && !!avail && avail.free >= safeQty && avail.free > 0;

  function setDate(d: string) {
    setDateState(d);
    planner.set({ date: d });
  }

  function submit() {
    if (!isClient) return toast(t("vendor.onlyClients"));
    if (!date) return toast(t("booking.selectDate"));
    setSubmitting(true);
    try {
      const b = createBooking(actor, { offerId: offer!.id, date, qty: safeQty, eventId: eventId || undefined, note });
      router.push(`/checkout/${b.id}`);
    } catch (err) {
      setSubmitting(false);
      if (err instanceof AvailabilityError) toast.error(err.free ? t("booking.notEnough", { n: err.free }) : t("booking.soldOut"));
      else toast.error(t("common.error"));
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-16 md:px-6 md:pt-10">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex h-9 items-center gap-2 rounded-lg pr-3 text-sm text-text-secondary transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {vendor.name}
      </button>
      <h1 className="mt-4 font-serif text-[32px] leading-tight font-normal md:text-5xl">{t("booking.title")}</h1>
      <p className="mt-1 text-md text-text-secondary">{l(offer.title)}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="text-base font-medium">{t("booking.date")}</h2>
            <div className="mt-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
              <AvailabilityCalendar vendorId={vendor.id} offerId={offer.id} value={date} onChange={setDate} />
              <p className="mt-3 text-xs text-muted-foreground">{t("vendor.calendarHint")}</p>
            </div>
          </section>

          <section className="grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="text-base font-medium">{t("booking.qty")}</h2>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-11 items-center rounded-lg border border-input bg-card">
                  <button
                    type="button"
                    onClick={() => setQty(Math.max(1, safeQty - 1))}
                    disabled={safeQty <= 1}
                    className="flex size-11 items-center justify-center text-text-secondary disabled:opacity-30"
                    aria-label="−"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-10 text-center text-md font-medium tabular-nums">{safeQty}</span>
                  <button
                    type="button"
                    onClick={() => setQty(Math.min(maxQty, safeQty + 1))}
                    disabled={safeQty >= maxQty}
                    className="flex size-11 items-center justify-center text-text-secondary disabled:opacity-30"
                    aria-label="+"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                <span className="text-sm text-muted-foreground">{l(offer.unit)}</span>
              </div>
              <div className="mt-3 min-h-5">
                {avail ? (
                  <AvailDots a={avail} size="sm" />
                ) : (
                  <span className="text-xs text-muted-foreground">{t("booking.selectDate")}</span>
                )}
              </div>
            </div>
            {events.length > 0 && (
              <div>
                <h2 className="text-base font-medium">{t("booking.event")}</h2>
                <NativeSelect className="mt-3 w-full" value={eventId} onChange={(e) => setEventId(e.target.value)}>
                  <option value="">{t("booking.noEvent")}</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )}
          </section>

          <section>
            <label htmlFor="note" className="text-base font-medium">
              {t("booking.note")} <span className="text-sm font-normal text-muted-foreground">· {t("common.optional")}</span>
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={t("booking.notePlaceholder")}
              className="mt-3 w-full resize-none rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            />
          </section>
        </div>

        <aside>
          <div className="lg:sticky lg:top-24">
            <BookingSummary
              vendor={vendor}
              offer={offer}
              date={date}
              qty={safeQty}
              total={total}
              prepay={prepay}
              prepayPercent={vendor.prepayPercent}
            />
            {avail && avail.free === 0 && <p className="mt-3 text-sm text-destructive">{t("booking.soldOut")}</p>}
            <Button className="mt-4 h-12 w-full text-md" disabled={!canPay || submitting} onClick={submit}>
              {t("booking.pay")} · {money(prepay)}
            </Button>
            {!isClient && <p className="mt-3 text-center text-xs text-muted-foreground">{t("vendor.onlyClients")}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
