"use client";

/** Vendor availability calendar: free units per day, blocking units sold elsewhere */
import { format } from "date-fns";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { AvailDots } from "@/components/avail-dots";
import { MonthCalendar } from "@/components/month-calendar";
import { Empty, Section } from "@/components/panel";
import { NativeSelect } from "@/components/ui/native-select";
import { setBlockedUnits } from "@/lib/data/actions";
import { useAvailabilityLookup } from "@/lib/data/views/availability";
import { useActiveOffers } from "@/lib/data/views/vendor";
import type { Vendor } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAction } from "@/lib/data/use-action";

export function VendorCalendar({ vendor }: { vendor: Vendor }) {
  const { run } = useAction();
  const { t, l, date: fmt } = useI18n();
  const offers = useActiveOffers(vendor.id);
  const [offerId, setOfferId] = useState(offers[0]?.id ?? "");
  const [day, setDay] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const offer = offers.find((o) => o.id === offerId) ?? offers[0];
  const availabilityOn = useAvailabilityLookup({ offerId: offer?.id });

  if (!offer) return <Empty>{t("vp.noOffers")}</Empty>;
  const a = availabilityOn(day);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Section
        title={t("vp.calendar")}
        action={
          <NativeSelect
            value={offer.id}
            onChange={(e) => setOfferId(e.target.value)}
            className="max-w-[60%]"
            aria-label={t("vp.selectOffer")}
          >
            {offers.map((o) => (
              <option key={o.id} value={o.id}>
                {l(o.title)}
              </option>
            ))}
          </NativeSelect>
        }
      >
        <MonthCalendar
          value={day}
          onChange={setDay}
          renderDay={(d) => {
            if (!d.inMonth) return null;
            const av = availabilityOn(d.iso);
            return (
              <>
                <span>{format(d.date, "d")}</span>
                {!d.past && (
                  <span
                    className={cn(
                      "text-2xs leading-none tabular-nums",
                      d.selected ? "text-primary-foreground/80" : av.free ? "text-primary" : "text-muted-foreground/60",
                    )}
                  >
                    {av.free}/{av.total}
                  </span>
                )}
              </>
            );
          }}
        />
      </Section>
      <Section title={t("vp.blockTitle", { date: fmt(day, "d MMMM") })}>
        <div className="flex flex-col gap-4">
          <AvailDots a={a} />
          <div>
            <div className="text-sm text-text-secondary">{t("vp.blockHint")}</div>
            <div className="mt-2 flex h-11 w-fit items-center rounded-full bg-foreground/[0.045]">
              <button
                type="button"
                className="flex size-11 items-center justify-center text-text-secondary disabled:opacity-30"
                disabled={a.blocked <= 0}
                onClick={() => run(() => setBlockedUnits(offer.id, day, a.blocked - 1))}
                aria-label="−"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-12 text-center text-md font-medium tabular-nums">{a.blocked}</span>
              <button
                type="button"
                className="flex size-11 items-center justify-center text-text-secondary disabled:opacity-30"
                disabled={a.blocked + a.booked >= a.total}
                onClick={() => run(() => setBlockedUnits(offer.id, day, a.blocked + 1))}
                aria-label="+"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
          <dl className="flex flex-col gap-1 text-sm text-text-secondary tabular-nums">
            <div>{t("vp.bookedHere", { n: a.booked })}</div>
            <div>{t("vp.freeNow", { n: a.free, total: a.total })}</div>
          </dl>
        </div>
      </Section>
    </div>
  );
}
