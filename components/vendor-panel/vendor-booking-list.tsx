"use client";

import { toast } from "sonner";
import { BookingRow } from "@/components/booking/booking-row";
import { Empty } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { setBookingStatus } from "@/lib/data/actions";
import { useDB } from "@/lib/data/store";
import type { Booking } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { escrowOf } from "@/lib/payments/escrow";
import { useActor } from "@/lib/session";

/** Vendor bookings with the next action: confirm the deal in chat, mark as completed */
export function VendorBookingList({ bookings }: { bookings: Booking[] }) {
  const { t } = useI18n();
  const actor = useActor();
  const db = useDB((d) => d);
  const today = new Date().toISOString().slice(0, 10);
  if (!bookings.length) return <Empty>{t("vp.noIncoming")}</Empty>;
  return (
    <ul className="flex flex-col divide-y divide-border">
      {bookings.map((b) => {
        const conv = db.conversations.find((c) => c.bookingId === b.id);
        const e = escrowOf(b);
        const needsMe = e.state === "held" && !e.vendorConfirmedAt;
        return (
          <BookingRow
            key={b.id}
            b={b}
            perspective="vendor"
            actions={
              <>
                {needsMe && conv && (
                  <LinkButton href={`/messages/${conv.id}`} className="h-9 px-4">
                    {t("escrow.confirm")}
                  </LinkButton>
                )}
                {b.status === "confirmed" && b.date < today && (
                  <Button
                    variant="outline"
                    className="h-9 px-4"
                    onClick={() => {
                      setBookingStatus(actor, b.id, "completed");
                      toast.success(t("vcab.completedToast"));
                    }}
                  >
                    {t("vcab.markCompleted")}
                  </Button>
                )}
                {conv && !needsMe && (
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
  );
}
