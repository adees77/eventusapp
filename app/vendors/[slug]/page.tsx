"use client";

import { ArrowLeft, Clock, Heart, Layers, MessageCircle, ShieldCheck, Users } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AvailDots } from "@/components/avail-dots";
import { DatePicker } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { NativeSelect } from "@/components/ui/native-select";
import { AvailabilityCalendar } from "@/components/vendor/availability-calendar";
import { Monogram, Rating, VerifiedSeal } from "@/components/vendor/badges";
import { PostDialog } from "@/components/feed/post-dialog";
import { ensureConversation, toggleFavorite, toggleFollow, trackView } from "@/lib/data/actions";
import { followersOf } from "@/lib/data/feed";
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
  return (
    <Suspense>
      <VendorProfile />
    </Suspense>
  );
}

function VendorProfile() {
  const { slug } = useParams<{ slug: string }>();
  const { t, tn, l, money, num, date: fmtDate } = useI18n();
  const router = useRouter();
  const actor = useActor();
  const planner = usePlanner();
  const date = planner.date;

  const vendor = useDB((db) => vendorBySlug(db, slug));
  const offers = useDB((db) => (vendor ? activeOffers(db, vendor.id) : []));
  const reviews = useDB((db) =>
    db.reviews.filter((r) => r.vendorId === vendor?.id && !r.hidden).sort((a, b) => b.date.localeCompare(a.date)),
  );
  const category = useDB((db) => db.categories.find((c) => c.id === vendor?.category));
  const fav = useDB((db) => db.favorites.some((f) => f.userId === actor.id && f.vendorId === vendor?.id));
  const db = useDB((d) => d);
  const [calendarOffer, setCalendarOffer] = useState<string | null>(null);
  const params = useSearchParams();
  const tab = (["posts", "services", "reviews"] as const).find((k) => k === params.get("tab")) ?? "posts";
  const setTab = (k: "posts" | "services" | "reviews") =>
    router.replace(`/vendors/${slug}${k === "posts" ? "" : `?tab=${k}`}`, { scroll: false });
  const [openPost, setOpenPost] = useState<string | null>(null);
  const posts = useDB((d) =>
    d.posts.filter((p) => p.vendorId === vendor?.id && !p.hidden).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
  const followers = useDB((d) => (vendor ? followersOf(d, vendor.id) : 0));
  const following = useDB((d) => d.follows.some((f) => f.userId === actor.id && f.vendorId === vendor?.id));

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
      <div className="container-app pt-4 md:pt-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 flex size-9 items-center justify-center rounded-full text-text-secondary hover:bg-muted"
          aria-label={t("common.back")}
        >
          <ArrowLeft className="size-4" />
        </button>

        {/* Profile header, social style */}
        <header className="flex flex-col gap-6 md:flex-row md:items-center md:gap-10">
          <div className="flex items-center gap-5 md:block">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border md:size-36">
              {vendor.cover ? (
                <Image src={vendor.cover} alt="" fill loading="eager" sizes="144px" className="object-cover" />
              ) : (
                <Monogram name={vendor.name} className="size-full rounded-full text-3xl" />
              )}
            </div>
            <div className="min-w-0 md:hidden">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate font-serif text-3xl leading-tight font-normal">{vendor.name}</h1>
                {vendor.verified && <VerifiedSeal />}
              </div>
              <p className="text-sm text-text-secondary">
                {l(category?.name)} · {l(CITIES[vendor.city])}
              </p>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="hidden items-center gap-2 md:flex">
              <h1 className="font-serif text-4xl leading-tight font-normal">{vendor.name}</h1>
              {vendor.verified && <VerifiedSeal withLabel />}
            </div>
            <dl className="flex gap-8 md:mt-3">
              <Count value={num(posts.length)} label={t("profile.posts")} />
              <Count value={num(followers)} label={t("profile.followers")} />
              <Count value={vendor.rating ? vendor.rating.toFixed(1) : "—"} label={t("profile.rating")} />
            </dl>
            <p className="mt-3 hidden text-sm text-text-secondary md:block">
              {l(category?.name)} · {l(CITIES[vendor.city])} · {t("profile.responds", { n: vendor.responseMinutes })}
            </p>
            <p className="mt-3 max-w-prose text-md leading-relaxed">{l(vendor.tagline)}</p>
            {l(vendor.description) && (
              <p className="mt-1 line-clamp-3 max-w-prose text-sm leading-relaxed text-text-secondary">{l(vendor.description)}</p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                variant={following ? "outline" : "default"}
                className="h-10 px-5"
                onClick={() => (isClient ? toggleFollow(actor, vendor.id) : toast(t("vendor.onlyClients")))}
              >
                {following ? t("feed.unfollow") : t("feed.follow")}
              </Button>
              <Button variant="outline" className="h-10 px-4" onClick={write}>
                <MessageCircle strokeWidth={1.75} />
                {t("vendor.write")}
              </Button>
              <Button variant="outline" className="h-10 px-4" onClick={() => setTab("services")}>
                {t("vendor.book")}
              </Button>
              {isClient && (
                <Button
                  variant="ghost"
                  className="size-10 px-0"
                  onClick={() => toggleFavorite(actor, vendor.id)}
                  aria-pressed={fav}
                  aria-label={fav ? t("vendor.favorited") : t("vendor.favorite")}
                >
                  <Heart className={cn(fav && "fill-primary text-primary")} strokeWidth={1.75} />
                </Button>
              )}
            </div>
          </div>
        </header>

        {vendor.hidden && (
          <p className="mt-4 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-text-secondary">{t("vendor.hidden")}</p>
        )}

        <nav className="mt-8 flex justify-center gap-8 border-t border-border text-sm md:gap-12" aria-label={vendor.name}>
          {(["posts", "services", "reviews"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              aria-pressed={tab === k}
              className={cn(
                "relative -mt-px border-t py-3.5 transition-colors",
                tab === k ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t(k === "posts" ? "profile.tabPosts" : k === "services" ? "profile.tabServices" : "profile.tabReviews")}
              {k === "reviews" && reviews.length > 0 && <span className="ml-1.5 text-muted-foreground tabular-nums">{reviews.length}</span>}
            </button>
          ))}
        </nav>
      </div>

      {tab === "posts" && (
        <div className="container-app">
          {posts.length ? (
            <ul className="grid grid-cols-3 gap-1 md:gap-3">
              {posts.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setOpenPost(p.id)}
                    className="group relative block aspect-[4/5] w-full overflow-hidden rounded-md bg-muted md:rounded-xl"
                  >
                    <Image
                      src={p.photos[0]}
                      alt=""
                      fill
                      sizes="(min-width: 1280px) 400px, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                    {p.photos.length > 1 && <Layers className="absolute top-2 right-2 size-4 text-white drop-shadow" strokeWidth={1.75} />}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-16 text-center text-sm text-text-secondary">{t("profile.noPosts")}</p>
          )}
        </div>
      )}

      {tab === "reviews" && (
        <div className="container-app max-w-3xl">
          {reviews.length ? (
            <ul className="flex flex-col divide-y divide-border">
              {reviews.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 py-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{r.author}</span>
                    <span className="text-xs text-muted-foreground">{fmtDate(r.date, "d MMM yyyy")}</span>
                  </div>
                  <Rating value={r.rating} className="text-xs" />
                  <p className="text-sm leading-relaxed text-text-secondary">{l(r.text)}</p>
                  {r.reply && (
                    <div className="mt-1 border-l-2 border-gold/50 pl-3 text-sm">
                      <div className="text-xs text-muted-foreground">{t("profile.vendorReply")}</div>
                      <p className="mt-0.5 leading-relaxed text-text-secondary">{r.reply.text}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-16 text-center text-sm text-text-secondary">{t("profile.noPosts")}</p>
          )}
        </div>
      )}

      {tab === "services" && (
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
                <DatePicker
                  value={date}
                  onChange={(d) => planner.set({ date: d })}
                  className="w-full sm:w-60"
                  placeholder={t("avail.pickDate")}
                />
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
      )}

      <PostDialog postId={openPost} onOpenChange={(o) => !o && setOpenPost(null)} onOpen={setOpenPost} />

      {/* Mobile booking bar */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+60px)] z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur lg:hidden",
          tab !== "services" && "hidden",
        )}
      >
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

function Count({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col md:flex-row md:items-baseline md:gap-1.5">
      <dt className="sr-only">{label}</dt>
      <dd className="text-md font-medium tabular-nums">{value}</dd>
      <span className="text-xs text-text-secondary md:text-sm" aria-hidden>
        {label}
      </span>
    </div>
  );
}
