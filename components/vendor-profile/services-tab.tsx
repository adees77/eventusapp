"use client";

import { Clock, Pencil, Plus, ShieldCheck, Users } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { AvailDots } from "@/components/avail-dots";
import { DatePicker } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { NativeSelect } from "@/components/ui/native-select";
import { AvailabilityCalendar } from "@/components/vendor/availability-calendar";
import { useOffersAvailability } from "@/lib/data/views/availability";
import type { Offer, Vendor } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { usePlanner } from "@/lib/planner";
import { routes } from "@/lib/routes";

/** Vendor page, «Услуги и цены»: offers with availability on the picked date, and the calendar aside */
export function ServicesTab({
  vendor,
  offers,
  isOwner,
  onBook,
}: {
  vendor: Vendor;
  offers: Offer[];
  isOwner: boolean;
  onBook: (offer: Offer) => void;
}) {
  const { t, tn, l, money, date: fmtDate } = useI18n();
  const planner = usePlanner();
  const date = planner.date;
  const availabilityOf = useOffersAvailability();
  const [calendarOffer, setCalendarOffer] = useState<string | null>(null);
  const live = offers.filter((o) => o.active);
  const minPrice = live.length ? Math.min(...live.map((o) => o.price)) : 0;
  return (
    <div className="container-app grid gap-12 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0">
        <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-secondary">
          {vendor.yearsOnMarket > 0 && <div>{tn("vendor.years", vendor.yearsOnMarket)}</div>}
          <div className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
            {t("vendor.response", { n: vendor.responseMinutes })}
          </div>
          <div>{t("vendor.prepay", { p: vendor.prepayPercent })}</div>
          <div className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
            {t("escrow.title")}
          </div>
        </dl>

        {/* Offers */}
        <section className="mt-8" id="offers">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg font-medium">{t("vendor.offers")}</h2>
            {isOwner && (
              <LinkButton href={routes.createService} className="h-9 px-4">
                <Plus />
                {t("vp.addOffer")}
              </LinkButton>
            )}
            <DatePicker
              value={date}
              onChange={(d) => planner.set({ date: d })}
              className="w-full sm:w-60"
              placeholder={t("avail.pickDate")}
            />
          </div>
          <ul className="mt-4 flex flex-col divide-y divide-border rounded-2xl bg-card">
            {offers.map((o) => {
              const a = date ? availabilityOf(o, date) : null;
              return (
                <li key={o.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
                  <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:w-40">
                    {o.photos[0] && <Image src={o.photos[0]} alt="" fill sizes="160px" className="object-cover" />}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-md font-medium">{l(o.title)}</h3>
                      {!o.active ? (
                        <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{t("owner.offerOff")}</span>
                      ) : (
                        o.premium && <span className="shrink-0 text-xs text-gold-foreground">{t("vendor.premium")}</span>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary">{l(o.description)}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {o.capacity && (
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3.5" strokeWidth={1.5} />
                          {t("vendor.capacity", { n: o.capacity })}
                        </span>
                      )}
                      {!a && <span>{t("vendor.inStock", { n: o.totalUnits })}</span>}
                    </div>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex flex-col gap-1">
                        <span className="tabular-nums">
                          <span className="font-medium">{money(o.price)}</span>
                          <span className="text-sm text-muted-foreground"> / {l(o.unit)}</span>
                        </span>
                        {a && <AvailDots a={a} size="sm" />}
                      </div>
                      {isOwner ? (
                        <LinkButton href={routes.editService(o.id)} variant="outline" className="h-10 px-4">
                          <Pencil strokeWidth={1.75} />
                          {t("common.edit")}
                        </LinkButton>
                      ) : (
                        <Button className="h-10 px-5" disabled={a?.free === 0} onClick={() => onBook(o)}>
                          {t("vendor.book")}
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Aside: availability */}
      <aside className="lg:pt-6">
        <div className="rounded-2xl bg-card p-5 shadow-soft lg:sticky lg:top-24">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-base font-medium">{t("vendor.calendar")}</h2>
            <span className="text-sm text-muted-foreground tabular-nums">
              {t("common.from")} {money(minPrice)}
            </span>
          </div>
          {offers.length > 1 && (
            <NativeSelect
              className="mt-4 w-full"
              value={calendarOffer ?? ""}
              onChange={(e) => setCalendarOffer(e.target.value || null)}
              aria-label={t("vendor.calendarFor")}
            >
              <option value="">{t("vendor.allOffers")}</option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {l(o.title)}
                </option>
              ))}
            </NativeSelect>
          )}
          <div className="mt-4">
            <AvailabilityCalendar
              vendorId={vendor.id}
              offerId={calendarOffer ?? (offers.length === 1 ? offers[0].id : null)}
              value={date}
              onChange={(d) => planner.set({ date: d })}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("vendor.calendarHint")}</p>
          {date && (
            <div className="mt-4 border-t border-border pt-4 text-sm">
              <div className="text-text-secondary">{t("vendor.selectedDate", { date: fmtDate(date, "d MMMM, EEEE") })}</div>
              <ul className="mt-2 flex flex-col gap-2">
                {offers.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm">{l(o.title)}</span>
                    <AvailDots a={availabilityOf(o, date)} size="sm" showLabel={false} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button
            className="mt-5 h-11 w-full text-md"
            onClick={() => document.getElementById("offers")?.scrollIntoView({ behavior: "smooth" })}
          >
            {t("vendor.book")}
          </Button>
        </div>
      </aside>
    </div>
  );
}
