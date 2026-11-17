"use client";

import { useState } from "react";
import { Empty } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { setBookingStatus } from "@/lib/data/actions";
import type { BookingView } from "@/lib/data/views/_shared";
import { useI18n } from "@/lib/i18n";
import { escrowOf } from "@/lib/payments/escrow";
import { BookingRow } from "./booking-row";
import { ReviewDialog } from "./review-dialog";
import { routes } from "@/lib/routes";
import { useAction } from "@/lib/data/use-action";

/** Client bookings with the next action for each: pay, confirm the deal, chat, review */
export function ClientBookingList({ rows, empty }: { rows: BookingView[]; empty?: React.ReactNode }) {
  const { run } = useAction();
  const { t } = useI18n();
  const [reviewFor, setReviewFor] = useState<BookingView | null>(null);

  if (!rows.length)
    return <Empty action={<LinkButton href={routes.feed}>{t("nav.feed")}</LinkButton>}>{empty ?? t("dashboard.noBookings")}</Empty>;

  return (
    <>
      <ul className="flex flex-col divide-y divide-border">
        {rows.map((row) => {
          const { booking: b, conversationId, reviewed } = row;
          const conv = conversationId ? { id: conversationId } : undefined;
          const e = escrowOf(b);
          const canReview =
            !reviewed && (b.status === "completed" || e.state === "released") && b.date <= new Date().toISOString().slice(0, 10);
          return (
            <BookingRow
              key={b.id}
              row={row}
              perspective="client"
              actions={
                <>
                  {b.status === "pending" && (
                    <>
                      <LinkButton href={routes.checkout(b.id)} className="h-9 px-4">
                        {t("dashboard.pay")}
                      </LinkButton>
                      <Button
                        variant="ghost"
                        className="h-9 px-3 text-muted-foreground"
                        onClick={() => run(() => setBookingStatus(b.id, "cancelled"))}
                      >
                        {t("dashboard.cancel")}
                      </Button>
                    </>
                  )}
                  {e.state === "held" && !e.clientConfirmedAt && conv && (
                    <LinkButton href={routes.chat(conv.id)} className="h-9 px-4">
                      {t("escrow.confirm")}
                    </LinkButton>
                  )}
                  {canReview && (
                    <Button variant="outline" className="h-9 px-4" onClick={() => setReviewFor(row)}>
                      {t("cabinet.leaveReview")}
                    </Button>
                  )}
                  {conv && !(e.state === "held" && !e.clientConfirmedAt) && (
                    <LinkButton href={routes.chat(conv.id)} variant="outline" className="h-9 px-4">
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
        bookingId={reviewFor?.booking.id ?? null}
        vendorName={reviewFor?.vendorName ?? ""}
        onClose={() => setReviewFor(null)}
      />
    </>
  );
}
