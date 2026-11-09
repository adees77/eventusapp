"use client";

import { ArrowLeft, Clock, Heart, MapPin, MessageCircle, Users } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AvailDots } from "@/components/avail-dots";
import { DatePicker } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { NativeSelect } from "@/components/ui/native-select";
import { AvailabilityCalendar } from "@/components/vendor/availability-calendar";
import { Monogram, Rating, VerifiedSeal } from "@/components/vendor/badges";
import { Gallery } from "@/components/vendor/gallery";
import { ensureConversation, toggleFavorite, trackView } from "@/lib/data/actions";
import { getAvailability } from "@/lib/data/availability";
import { can } from "@/lib/data/policies";
import { activeOffers, vendorBySlug } from "@/lib/data/queries";
import { CITIES } from "@/lib/data/seed/catalog";
import { useDB } from "@/lib/data/store";
import type { Offer } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { usePlanner } from "@/lib/planner";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

export default function VendorPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, tn, l, money, date: fmtDate } = useI18n();
  const router = useRouter();
  const actor = useActor();
  const planner = usePlanner();
  const date = planner.date;

  const vendor = useDB((db) => vendorBySlug(db, slug));
  const offers = useDB((db) => (vendor ? activeOffers(db, vendor.id) : []));
  const reviews = useDB((db) => db.reviews.filter((r) => r.vendorId === vendor?.id).sort((a, b) => b.date.localeCompare(a.date)));
  const category = useDB((db) => db.categories.find((c) => c.id === vendor?.category));
  const fav = useDB((db) => db.favorites.some((f) => f.userId === actor.id && f.vendorId === vendor?.id));
  const db = useDB((d) => d);
  const [calendarOffer, setCalendarOffer] = useState<string | null>(null);

  const tracked = useRef<string | null>(null);
  useEffect(() => {
    if (vendor && tracked.current !== vendor.id && actor.id !== vendor.ownerId) {
      tracked.current = vendor.id;
      trackView(vendor.id);
    }
  }, [vendor, actor.id]);

  if (!vendor || !can.viewVendor(actor, vendor)) {
    return (
      <div className="mx-auto flex max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <p className="font-serif text-2xl">{t("vendor.notFound")}</p>
        <LinkButton href="/vendors" variant="outline">
          {t("nav.catalog")}
        </LinkButton>
      </div>
    );
  }

  const minPrice = offers.length ? Math.min(...offers.map((o) => o.price)) : 0;
  const isClient = actor.role === "client";

  function book(offer: Offer) {
    if (!isClient) return toast(t("vendor.onlyClients"));
    router.push(`/book/${offer.id}${date ? `?date=${date}` : ""}`);
  }

  function write() {
    if (!isClient) return toast(t("vendor.onlyClients"));
    const id = ensureConversation(actor, vendor!.id);
    router.push(`/messages/${id}`);
  }

  return (
    <div className="pb-28 lg:pb-16">
      {/* Cover */}
      <div className="relative mx-auto max-w-7xl md:px-6 md:pt-6 xl:px-8">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted sm:aspect-[21/9] md:rounded-2xl">
          {vendor.cover && <Image src={vendor.cover} alt="" fill priority sizes="(min-width: 1152px) 1104px, 100vw" className="object-cover" />}
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute top-4 left-4 flex size-10 items-center justify-center rounded-full bg-card/90 shadow-soft backdrop-blur md:top-10 md:left-10"
          aria-label={t("common.back")}
        >
          <ArrowLeft className="size-4" />
        </button>
      </div>

      <div className="container-app grid gap-12 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          {/* Header */}
          <header className="mt-6 flex items-start gap-4">
            <Monogram name={vendor.name} className="size-14 text-xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h1 className="font-serif text-4xl leading-tight font-normal md:text-5xl">{vendor.name}</h1>
                {vendor.verified && <VerifiedSeal withLabel />}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
                <span>{l(category?.name)}</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
                  {l(CITIES[vendor.city])}
                </span>
                <Rating value={vendor.rating} count={vendor.reviewsCount} />
              </div>
            </div>
          </header>

          {vendor.hidden && (
            <p className="mt-4 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-text-secondary">{t("vendor.hidden")}</p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {isClient && (
              <Button variant="outline" className="h-10 px-4" onClick={() => toggleFavorite(actor, vendor.id)} aria-pressed={fav}>
                <Heart className={cn(fav && "fill-primary text-primary")} strokeWidth={1.75} />
                {fav ? t("vendor.favorited") : t("vendor.favorite")}
              </Button>
            )}
            <Button variant="outline" className="h-10 px-4" onClick={write}>
              <MessageCircle strokeWidth={1.75} />
              {t("vendor.write")}
            </Button>
          </div>

          {/* About */}
          <section className="mt-10">
            <h2 className="text-lg font-medium">{t("vendor.about")}</h2>
            <p className="mt-3 max-w-prose text-md leading-relaxed text-text-secondary">{l(vendor.description)}</p>
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-secondary">
              {vendor.yearsOnMarket > 0 && <div>{tn("vendor.years", vendor.yearsOnMarket)}</div>}
              <div className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
                {t("vendor.response", { n: vendor.responseMinutes })}
              </div>
              <div>{t("vendor.prepay", { p: vendor.prepayPercent })}</div>
            </dl>
          </section>

          {/* Offers */}
          <section className="mt-12" id="offers">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-lg font-medium">{t("vendor.offers")}</h2>
              <DatePicker value={date} onChange={(d) => planner.set({ date: d })} className="w-full sm:w-60" placeholder={t("avail.pickDate")} />
            </div>
            <ul className="mt-4 flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
              {offers.map((o) => {
                const a = date ? getAvailability(db, o, date) : null;
                return (
                  <li key={o.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
                    <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:w-40">
                      {o.photos[0] && <Image src={o.photos[0]} alt="" fill sizes="160px" className="object-cover" />}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-md font-medium">{l(o.title)}</h3>
                        {o.premium && <span className="shrink-0 text-xs text-gold-foreground">{t("vendor.premium")}</span>}
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
                        <Button className="h-10 px-5" disabled={a?.free === 0} onClick={() => book(o)}>
                          {t("vendor.book")}
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Portfolio */}
          {vendor.portfolio.length > 0 && (
            <section className="mt-12">
              <h2 className="text-lg font-medium">{t("vendor.portfolio")}</h2>
              <div className="mt-4">
                <Gallery photos={vendor.portfolio} title={vendor.name} />
              </div>
            </section>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <section className="mt-12">
              <h2 className="text-lg font-medium">
                {t("vendor.reviews")} <span className="text-muted-foreground tabular-nums">· {vendor.rating.toFixed(1)}</span>
              </h2>
              <ul className="mt-4 grid gap-6 sm:grid-cols-2">
                {reviews.map((r) => (
                  <li key={r.id} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{r.author}</span>
                      <span className="text-xs text-muted-foreground">{fmtDate(r.date, "d MMM yyyy")}</span>
                    </div>
                    <Rating value={r.rating} className="text-xs" />
                    <p className="text-sm leading-relaxed text-text-secondary">{l(r.text)}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Aside: availability */}
        <aside className="lg:pt-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:sticky lg:top-24">
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
                      <AvailDots a={getAvailability(db, o, date)} size="sm" showLabel={false} />
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

      {/* Mobile booking bar */}
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+60px)] z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div className="text-sm tabular-nums">
            <span className="text-muted-foreground">{t("common.from")} </span>
            <span className="font-medium">{money(minPrice)}</span>
            {date && <div className="text-xs text-muted-foreground">{fmtDate(date, "d MMMM")}</div>}
          </div>
          <Button className="h-11 px-6" onClick={() => document.getElementById("offers")?.scrollIntoView({ behavior: "smooth" })}>
            {t("vendor.book")}
          </Button>
        </div>
      </div>
    </div>
  );
}

