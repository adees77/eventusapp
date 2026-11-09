"use client";

import { format } from "date-fns";
import { MonthCalendar } from "@/components/month-calendar";
import { getAvailability, getVendorAvailability } from "@/lib/data/availability";
import { useDB } from "@/lib/data/store";
import type { DB } from "@/lib/data/types";
import { cn } from "@/lib/utils";

/** Month grid where each day shows how many units are free. */
export function AvailabilityCalendar({
  vendorId,
  offerId,
  value,
  onChange,
}: {
  vendorId: string;
  offerId: string | null;
  value: string | null;
  onChange: (iso: string) => void;
}) {
  const db = useDB((d) => d);
  const offer = offerId ? db.offers.find((o) => o.id === offerId) : null;

  const availOn = (iso: string) => (offer ? getAvailability(db, offer, iso) : getVendorAvailability(db as DB, vendorId, iso));

  return (
    <MonthCalendar
      value={value}
      onChange={onChange}
      initialMonth={value}
      renderDay={(d) => {
        if (!d.inMonth) return null;
        const a = availOn(d.iso);
        const none = a.free === 0;
        return (
          <>
            <span className={cn(none && !d.selected && "text-muted-foreground line-through decoration-foreground/20")}>
              {format(d.date, "d")}
            </span>
            {!d.past && (
              <span
                className={cn(
                  "text-2xs leading-none tabular-nums",
                  d.selected ? "text-primary-foreground/80" : none ? "text-muted-foreground/60" : "text-primary",
                )}
              >
                {a.total === 1 ? (none ? "·" : "●") : a.free}
              </span>
            )}
          </>
        );
      }}
      cellClassName={(d) => (d.inMonth && !d.past && availOn(d.iso).free === 0 && !d.selected ? "bg-muted/60" : undefined)}
    />
  );
}
