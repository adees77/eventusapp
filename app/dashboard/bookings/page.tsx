"use client";

import { useState } from "react";
import { ClientBookingList } from "@/components/booking/client-booking-list";
import { PageHeader, Segmented } from "@/components/panel";
import { useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { escrowOf } from "@/lib/payments/escrow";
import { useActor } from "@/lib/session";

type Filter = "active" | "action" | "past" | "cancelled";

export default function ClientBookings() {
  const { t } = useI18n();
  const actor = useActor();
  const [f, setF] = useState<Filter>("active");
  const today = new Date().toISOString().slice(0, 10);
  const all = useDB((db) => db.bookings.filter((b) => b.clientId === actor.id).sort((a, b) => a.date.localeCompare(b.date)));
  const list = all.filter((b) => {
    if (f === "cancelled") return b.status === "cancelled";
    if (b.status === "cancelled") return false;
    if (f === "action") return b.status === "pending" || (escrowOf(b).state === "held" && !b.escrow?.clientConfirmedAt);
    if (f === "past") return b.date < today;
    return b.date >= today;
  });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("cabinet.bookings")} subtitle={t("cabinet.bookingsHint")} />
      <Segmented
        value={f}
        onChange={setF}
        options={[
          { value: "active", label: t("cabinet.fActive") },
          { value: "action", label: t("cabinet.fAction") },
          { value: "past", label: t("cabinet.fPast") },
          { value: "cancelled", label: t("cabinet.fCancelled") },
        ]}
      />
      <div className="rounded-2xl bg-card p-5">
        <ClientBookingList bookings={f === "past" ? [...list].reverse() : list} />
      </div>
    </div>
  );
}
