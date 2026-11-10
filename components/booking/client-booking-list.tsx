"use client";

import { useState } from "react";
import { Empty } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { setBookingStatus } from "@/lib/data/actions";
import { useDB } from "@/lib/data/store";
import type { Booking } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { escrowOf } from "@/lib/payments/escrow";
import { useActor } from "@/lib/session";
import { BookingRow } from "./booking-row";
import { ReviewDialog } from "./review-dialog";

/** Client bookings with the next action for each: pay, confirm the deal, chat, review */
export function ClientBookingList({ bookings, empty }: { bookings: Booking[]; empty?: React.ReactNode }) {
  const { t } = useI18n();
  const actor = useActor();
  const db = useDB((d) => d);
  const [reviewFor, setReviewFor] = useState<Booking | null>(null);

  if (!bookings.length)
    return <Empty action={<LinkButton href="/vendors">{t("nav.feed")}</LinkButton>}>{empty ?? t("dashboard.noBookings")}</Empty>;

  return (
    <>
      <ul className="flex flex-col divide-y divide-border">
        {bookings.map((b) => {
          const conv = db.conversations.find((c) => c.bookingId === b.id);
          const e = escrowOf(b);
          const reviewed = db.reviews.some((r) => r.bookingId === b.id);
          const canReview =
            !reviewed && (b.status === "completed" || e.state === "released") && b.date <= new Date().toISOString().slice(0, 10);
          return (
            <BookingRow
              key={b.id}
              b={b}
              perspective="client"
              actions={
                <>
                  {b.status === "pending" && (
                    <>
                      <LinkButton href={`/checkout/${b.id}`} className="h-9 px-4">
                        {t("dashboard.pay")}
                      </LinkButton>
                      <Button
                        variant="ghost"
                        className="h-9 px-3 text-muted-foreground"
                        onClick={() => setBookingStatus(actor, b.id, "cancelled")}
                      >
                        {t("dashboard.cancel")}
                      </Button>
                    </>
                  )}
                  {e.state === "held" && !e.clientConfirmedAt && conv && (
                    <LinkButton href={`/messages/${conv.id}`} className="h-9 px-4">
                      {t("escrow.confirm")}
                    </LinkButton>
                  )}
                  {canReview && (
                    <Button variant="outline" className="h-9 px-4" onClick={() => setReviewFor(b)}>
                      {t("cabinet.leaveReview")}
                    </Button>
                  )}
                  {conv && !(e.state === "held" && !e.clientConfirmedAt) && (
                    <LinkButton href={`/messages/${conv.id}`} variant="outline" className="h-9 px-4">
                      {t("dashboard.chat")}
                    </LinkButton>
                  )}
                </>
              }
            />
          );
        })}
      </ul>
      <ReviewDialog
        bookingId={reviewFor?.id ?? null}
        vendorName={db.vendors.find((v) => v.id === reviewFor?.vendorId)?.name ?? ""}
        onClose={() => setReviewFor(null)}
      />
    </>
  );
}
