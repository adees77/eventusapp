"use client";

import { Check, CreditCard, Loader2, QrCode, ShieldCheck, Wallet } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { BookingSummary } from "@/components/booking/booking-summary";
import { EscrowSteps } from "@/components/booking/deal-card";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { AvailabilityError, markBookingPrepaid } from "@/lib/data/actions";
import { offerById, vendorById } from "@/lib/data/queries";
import { useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { getPaymentProvider, type PaymentMethod } from "@/lib/payments/provider";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

const METHODS: { id: PaymentMethod; icon: typeof CreditCard }[] = [
  { id: "card", icon: CreditCard },
  { id: "qr", icon: QrCode },
  { id: "wallet", icon: Wallet },
];

type Phase = "idle" | "processing" | "success" | "failed";

export default function CheckoutPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();
  const { t, money, l } = useI18n();
  const actor = useActor();
  const db = useDB((d) => d);
  const booking = db.bookings.find((b) => b.id === bookingId);
  const offer = booking ? offerById(db, booking.offerId) : undefined;
  const vendor = booking ? vendorById(db, booking.vendorId) : undefined;
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  if (!booking || !offer || !vendor || booking.clientId !== actor.id) {
    return (
      <div className="mx-auto flex max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <p className="font-serif text-2xl">{t("checkout.notFound")}</p>
        <LinkButton href="/dashboard" variant="outline">
          {t("nav.dashboard")}
        </LinkButton>
      </div>
    );
  }

  const alreadyPaid = booking.status !== "pending" && phase !== "success";
  const conversationId = db.conversations.find((c) => c.bookingId === booking.id)?.id;

  async function pay() {
    setPhase("processing");
    setError(null);
    try {
      const provider = getPaymentProvider();
      const res = await provider.pay({
        bookingId: booking!.id,
        amount: booking!.prepayAmount,
        currency: "KGS",
        method,
        description: `${vendor!.name} — ${l(offer!.title)}`,
      });
      if (res.status === "redirect" && res.redirectUrl) {
        window.location.assign(res.redirectUrl);
        return;
      }
      if (res.status !== "succeeded") throw new Error(res.error ?? "failed");
      const convId = markBookingPrepaid(actor, booking!.id, res.reference);
      setPhase("success");
      setTimeout(() => router.push(`/messages/${convId}`), 1600);
    } catch (err) {
      setPhase("failed");
      setError(err instanceof AvailabilityError ? t("checkout.unavailable") : t("common.error"));
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-8 pb-16 md:pt-12">
      <div className="flex items-center gap-2 rounded-xl border border-gold/40 bg-gold-soft px-4 py-3 text-sm text-gold-foreground">
        <ShieldCheck className="size-4 shrink-0" strokeWidth={1.75} />
        {t("checkout.escrowBanner")}
      </div>

      {phase === "success" ? (
        <div className="flex animate-rise flex-col items-center py-16 text-center" aria-live="polite">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-6" strokeWidth={2} />
          </span>
          <h1 className="mt-6 font-serif text-4xl font-normal">{t("checkout.success")}</h1>
          <p className="mt-2 text-md text-text-secondary">{t("checkout.successHint")}</p>
          <p className="mt-6 text-2xl font-medium tabular-nums">{money(booking.prepayAmount)}</p>
        </div>
      ) : (
        <>
          <h1 className="mt-8 font-serif text-4xl font-normal">{t("checkout.title")}</h1>
          <div className="mt-6">
            <BookingSummary
              vendor={vendor}
              offer={offer}
              date={booking.date}
              qty={booking.qty}
              total={booking.total}
              prepay={booking.prepayAmount}
              prepayPercent={vendor.prepayPercent}
            />
          </div>

          {alreadyPaid ? (
            <div className="mt-6 flex flex-col gap-3">
              <p className="text-sm text-text-secondary">{t("checkout.alreadyPaid")}</p>
              {conversationId && (
                <LinkButton href={`/messages/${conversationId}`} className="h-11">
                  {t("checkout.toChat")}
                </LinkButton>
              )}
            </div>
          ) : (
            <>
              <fieldset className="mt-8" disabled={phase === "processing"}>
                <legend className="text-base font-medium">{t("checkout.method")}</legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {METHODS.map(({ id, icon: Icon }) => (
                    <label
                      key={id}
                      className={cn(
                        "flex h-14 cursor-pointer items-center gap-3 rounded-xl border bg-card px-4 text-sm transition-colors",
                        method === id ? "border-primary ring-3 ring-primary/15" : "border-border hover:bg-muted/50",
                      )}
                    >
                      <input type="radio" name="method" value={id} checked={method === id} onChange={() => setMethod(id)} className="sr-only" />
                      <Icon className="size-[18px] text-text-secondary" strokeWidth={1.5} />
                      {t(`checkout.methods.${id}`)}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="mt-8 rounded-2xl border border-border bg-card p-5">
                <h2 className="text-sm font-medium">{t("escrow.title")}</h2>
                <EscrowSteps className="mt-4" />
                <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">{t("escrow.refundPolicy")}</p>
              </div>

              {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

              <Button className="mt-6 h-12 w-full text-md" onClick={pay} disabled={phase === "processing"}>
                {phase === "processing" ? (
                  <>
                    <Loader2 className="animate-spin" />
                    {t("checkout.processing")}
                  </>
                ) : (
                  t("checkout.pay", { amount: money(booking.prepayAmount) })
                )}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
