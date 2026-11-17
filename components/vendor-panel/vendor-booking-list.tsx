"use client";

import { BookingRow } from "@/components/booking/booking-row";
import { Empty } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { setBookingStatus } from "@/lib/data/actions";
import type { BookingView } from "@/lib/data/views/_shared";
import { useI18n } from "@/lib/i18n";
import { escrowOf } from "@/lib/payments/escrow";
import { routes } from "@/lib/routes";
import { useAction } from "@/lib/data/use-action";

/** Vendor bookings with the next action: confirm the deal in chat, mark as completed */
export function VendorBookingList({ rows }: { rows: BookingView[] }) {
  const { run } = useAction();
  const { t } = useI18n();
  const today = new Date().toISOString().slice(0, 10);
  if (!rows.length) return <Empty>{t("vp.noIncoming")}</Empty>;
  return (
    <ul className="flex flex-col divide-y divide-border">
      {rows.map((row) => {
        const { booking: b, conversationId } = row;
        const conv = conversationId ? { id: conversationId } : undefined;
        const e = escrowOf(b);
        const needsMe = e.state === "held" && !e.vendorConfirmedAt;
        return (
          <BookingRow
            key={b.id}
            row={row}
            perspective="vendor"
            actions={
              <>
                {needsMe && conv && (
                  <LinkButton href={routes.chat(conv.id)} className="h-9 px-4">
                    {t("escrow.confirm")}
                  </LinkButton>
                )}
                {b.status === "confirmed" && b.date < today && (
                  <Button
                    variant="outline"
                    className="h-9 px-4"
                    onClick={() => run(() => setBookingStatus(b.id, "completed"), { success: t("vcab.completedToast") })}
                  >
                    {t("vcab.markCompleted")}
                  </Button>
                )}
                {conv && !needsMe && (
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
  );
}
