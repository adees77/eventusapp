"use client";

import { useState } from "react";
import { PageHeader, Segmented } from "@/components/panel";
import { useMyVendor } from "@/components/vendor-panel/use-my-vendor";
import { VendorBookingList } from "@/components/vendor-panel/vendor-booking-list";
import { vendorBookings } from "@/lib/data/queries";
import { useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { escrowOf } from "@/lib/payments/escrow";

type F = "action" | "upcoming" | "past" | "cancelled";

export default function VendorBookings() {
  const { t } = useI18n();
  const vendor = useMyVendor();
  const all = useDB((db) => vendorBookings(db, vendor.id));
  const [f, setF] = useState<F>("upcoming");
  const today = new Date().toISOString().slice(0, 10);
  const list = all
    .filter((b) => {
      if (f === "cancelled") return b.status === "cancelled";
      if (b.status === "cancelled") return false;
      if (f === "action") return escrowOf(b).state === "held" && !b.escrow?.vendorConfirmedAt;
      if (f === "past") return b.date < today;
      return b.date >= today;
    })
    .sort((a, b) => (f === "past" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("cabinet.bookings")} subtitle={t("vcab.bookingsHint")} />
      <Segmented
        value={f}
        onChange={setF}
        options={[
          { value: "upcoming", label: t("cabinet.fActive") },
          { value: "action", label: t("cabinet.fAction") },
          { value: "past", label: t("cabinet.fPast") },
          { value: "cancelled", label: t("cabinet.fCancelled") },
        ]}
      />
      <div className="rounded-2xl border border-border bg-card p-5">
        <VendorBookingList bookings={list} />
      </div>
    </div>
  );
}
