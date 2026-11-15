"use client";

import { ArrowLeft, BarChart3, Heart, MessageCircle, Pencil, Flag } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Monogram, VerifiedSeal } from "@/components/vendor/badges";
import { PostDialog } from "@/components/feed/post-dialog";
import { ReportForm } from "@/components/feed/report-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ensureConversation, toggleFavorite, trackView } from "@/lib/data/actions";
import { specFacts } from "@/lib/data/specs";
import { can } from "@/lib/data/policies";
import { CITIES } from "@/lib/data/seed/catalog";
import { useVendorReviews } from "@/lib/data/views/feed";
import { useVendorProfile } from "@/lib/data/views/vendor";
import { DetailsTab } from "@/components/vendor-profile/details-tab";
import { PostsTab } from "@/components/vendor-profile/posts-tab";
import { ReviewsTab } from "@/components/vendor-profile/reviews-tab";
import { ServicesTab } from "@/components/vendor-profile/services-tab";
import type { Offer } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { usePlanner } from "@/lib/planner";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";

const TABS = ["posts", "details", "services", "reviews"] as const;
const TAB_LABEL = {
  posts: "profile.tabPosts",
  details: "profile.tabDetails",
  services: "profile.tabServices",
  reviews: "profile.tabReviews",
} as const;

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

  const { vendor, offers, category, favorite: fav, posts, orders } = useVendorProfile(slug, actor.id);
  const reviews = useVendorReviews(vendor?.id);
  const params = useSearchParams();
  const tab = TABS.find((k) => k === params.get("tab")) ?? "posts";
  const setTab = (k: (typeof TABS)[number]) =>
    router.replace(routes.vendor(slug, k), { scroll: false });
  const [openPost, setOpenPost] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);

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
        <p className="font-heading tracking-[-0.025em] text-2xl">{t("vendor.notFound")}</p>
        <LinkButton href={routes.feed} variant="outline">
          {t("nav.catalog")}
        </LinkButton>
      </div>
    );
  }

  const live = offers.filter((o) => o.active);
  const minPrice = live.length ? Math.min(...live.map((o) => o.price)) : 0;
  const isClient = actor.role === "client";
  // the vendor looking at their own page: same view as clients, plus owner controls
  const isOwner = actor.id === vendor.ownerId;

  function book(offer: Offer) {
    if (!isClient) return toast(t("vendor.onlyClients"));
    router.push(routes.book(offer.id, { date }));
  }

  function write() {
    if (!isClient) return toast(t("vendor.onlyClients"));
    const id = ensureConversation(vendor!.id);
    router.push(routes.chat(id));
  }

  const actions = () =>
    isOwner ? (
      <>
        <LinkButton href={routes.vendorProfile} variant="outline" className="h-10 px-4">
          <Pencil strokeWidth={1.75} />
          {t("owner.editProfile")}
        </LinkButton>
        <LinkButton href={routes.vendorHome} variant="outline" className="h-10 px-4">
          <BarChart3 strokeWidth={1.75} />
          {t("owner.stats")}
        </LinkButton>
      </>
    ) : (
      <>
        <Button variant="sun" className="h-10 px-5" onClick={() => setTab("services")}>
          {t("vendor.book")}
        </Button>
        <Button variant="outline" className="h-10 px-4" onClick={write}>
          <MessageCircle strokeWidth={1.75} />
          {t("vendor.write")}
        </Button>
        {isClient && (
          <Button
            variant="outline"
            className="size-10 px-0"
            onClick={() => toggleFavorite(vendor.id)}
            aria-pressed={fav}
            aria-label={fav ? t("vendor.favorited") : t("vendor.favorite")}
          >
            <Heart className={cn(fav && "fill-primary text-primary")} strokeWidth={1.75} />
          </Button>
        )}
        {isClient && (
          <Button variant="outline" className="size-10 px-0" onClick={() => setReporting(true)} aria-label={t("mod.report")} title={t("mod.report")}>
            <Flag strokeWidth={1.75} />
          </Button>
        )}
      </>
    );

  return (
    <div className="pb-28 lg:pb-16">
      <div className="container-app pt-4 md:pt-8">
        {!isOwner && (
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 flex size-9 items-center justify-center rounded-full text-text-secondary hover:bg-muted"
          aria-label={t("common.back")}
        >
          <ArrowLeft className="size-4" />
        </button>
        )}
        {isOwner && <p className="-mt-2 mb-4 text-xs text-muted-foreground">{t("owner.banner")}</p>}

        {/* Profile header: cover, avatar on its edge, name on its own line, then about + numbers side by side */}
        <header>
          <div className="relative h-36 overflow-hidden rounded-[28px] surface-ink md:h-56">
            {(vendor.portfolio[1] ?? vendor.cover) && (
              <Image
                src={vendor.portfolio[1] ?? vendor.cover}
                alt=""
                fill
                loading="eager"
                sizes="(min-width: 1280px) 1232px, 100vw"
                className="object-cover"
              />
            )}
            <span className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/10 to-transparent" aria-hidden />
          </div>

          <div className="px-1 md:px-6">
            <div className="-mt-11 flex items-end justify-between gap-3 md:-mt-16">
              <div className="relative size-22 shrink-0 overflow-hidden rounded-full bg-muted ring-4 ring-background md:size-32">
                {vendor.cover ? (
                  <Image src={vendor.cover} alt="" fill loading="eager" sizes="128px" className="object-cover" />
                ) : (
                  <Monogram name={vendor.name} className="size-full rounded-full text-3xl" />
                )}
              </div>
              <div className="hidden flex-wrap justify-end gap-2 md:flex">{actions()}</div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <h1 className="display min-w-0 text-[28px] md:text-[40px]">{vendor.name}</h1>
              {vendor.verified && <VerifiedSeal withLabel className="shrink-0" />}
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              {l(category?.name)} · {l(CITIES[vendor.city])} · {t("profile.responds", { n: vendor.responseMinutes })}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 md:hidden">{actions()}</div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
              <div className="min-w-0">
                <p className="max-w-prose text-md leading-relaxed md:text-lg">{l(vendor.tagline)}</p>
                {l(vendor.description) && (
                  <p className="mt-2 line-clamp-3 max-w-prose text-sm leading-relaxed text-text-secondary">{l(vendor.description)}</p>
                )}
                {specFacts(vendor.category, vendor.specs).length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {specFacts(vendor.category, vendor.specs).map((f) => (
                      <button
                        key={l(f)}
                        type="button"
                        onClick={() => setTab("details")}
                        className="h-8 rounded-full bg-secondary px-3.5 text-sm text-primary transition-colors hover:bg-secondary/70"
                      >
                        {l(f)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <dl className="grid grid-cols-3 gap-2 self-start">
                <Count value={num(posts.length)} label={tn("profile.postsN", posts.length)} />
                <Count value={num(orders)} label={tn("profile.ordersN", orders)} />
                <Count value={vendor.rating ? vendor.rating.toFixed(1) : "—"} label={t("profile.rating")} />
              </dl>
            </div>
          </div>
        </header>

        {vendor.hidden && (
          <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm text-text-secondary">{t("vendor.hidden")}</p>
        )}

        <nav className="no-scrollbar mt-8 flex justify-start gap-1 overflow-x-auto text-sm md:justify-center" aria-label={vendor.name}>
          {TABS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              aria-pressed={tab === k}
              className={cn(
                "h-9 shrink-0 rounded-full px-4 transition-colors",
                tab === k ? "bg-ink text-white" : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
              )}
            >
              {t(TAB_LABEL[k])}
              {k === "reviews" && reviews.length > 0 && <span className={cn("ml-1.5 tabular-nums", tab === k ? "text-sun" : "text-muted-foreground")}>{reviews.length}</span>}
            </button>
          ))}
        </nav>
      </div>

      {tab === "posts" && <PostsTab posts={posts} isOwner={isOwner} onOpen={setOpenPost} />}

      {tab === "details" && <DetailsTab vendor={vendor} isOwner={isOwner} />}

      {tab === "reviews" && <ReviewsTab vendor={vendor} reviews={reviews} />}

      {tab === "services" && <ServicesTab vendor={vendor} offers={offers} isOwner={isOwner} onBook={book} />}

      <PostDialog postId={openPost} order={posts.map((p) => p.id)} onOpenChange={(o) => !o && setOpenPost(null)} />

      <Dialog open={reporting} onOpenChange={setReporting}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("mod.reportTitle")}</DialogTitle>
          </DialogHeader>
          {reporting && <ReportForm target="vendor" targetId={vendor.id} onDone={() => setReporting(false)} />}
        </DialogContent>
      </Dialog>

      {/* Mobile booking bar */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+60px)] z-30 bg-card/95 shadow-[0_-8px_24px_rgb(13_26_47/0.08)] px-4 py-3 backdrop-blur lg:hidden",
          (tab !== "services" || isOwner) && "hidden",
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
    <div className="flex flex-col gap-0.5 rounded-2xl bg-cream px-4 py-3">
      <dt className="sr-only">{label}</dt>
      <dd className="font-heading text-2xl tracking-[-0.03em] tabular-nums">{value}</dd>
      <span className="truncate text-xs text-text-secondary" aria-hidden>
        {label}
      </span>
    </div>
  );
}
