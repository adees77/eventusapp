"use client";

import { ArrowLeft, BarChart3, Flag, Star, Heart, Link2, MessageCircle, MoreHorizontal, Pencil, Send } from "lucide-react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ensureConversation, toggleFavorite, trackView } from "@/lib/data/actions";
import { specFacts } from "@/lib/data/specs";
import { can } from "@/lib/data/policies";
import { useVendorReviews } from "@/lib/data/views/feed";
import { useVendorProfile } from "@/lib/data/views/vendor";
import { usePricesHidden } from "@/lib/data/views/catalog";
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
import { background, useAction } from "@/lib/data/use-action";

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
  const { run } = useAction();
  const actor = useActor();
  const planner = usePlanner();
  const date = planner.date;

  const { vendor, offers, favorite: fav, posts, orders } = useVendorProfile(slug, actor.id);
  const reviews = useVendorReviews(vendor?.id);
  const hiddenSetting = usePricesHidden();
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
      background(() => trackView(vendor.id));
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
  // prices stay hidden from clients: they ask in the chat, where the vendor's AI assistant answers
  const pricesHidden = hiddenSetting && !isOwner && actor.role !== "admin";

  function book(offer: Offer) {
    if (!isClient) return toast(t("vendor.onlyClients"));
    router.push(routes.book(offer.id, { date }));
  }

  async function write(draft?: string) {
    if (!isClient) return toast(t("vendor.onlyClients"));
    const id = await run(() => ensureConversation(vendor!.id));
    if (id) router.push(routes.chat(id, { draft }));
  }
  /** «Узнать цену»: the chat opens with the question already typed */
  const askPrice = (offer?: Offer) =>
    void write(offer ? t("vendor.askPriceOffer", { title: l(offer.title) }) : t("vendor.askPriceDraft"));

  function share() {
    void navigator.clipboard?.writeText(`${location.origin}${routes.vendor(vendor!.slug)}`).catch(() => {});
    toast.success(t("feed.copied"));
  }

  const iconBtn = "size-10 px-0";
  const actions = () =>
    isOwner ? (
      <>
        <LinkButton href={routes.vendorProfile} variant="outline" className="h-10 px-4">
          <Pencil strokeWidth={1.75} />
          {t("owner.editProfile")}
        </LinkButton>
        <LinkButton href={routes.vendorHome} variant="outline" className={iconBtn} aria-label={t("owner.stats")} title={t("owner.stats")}>
          <BarChart3 strokeWidth={1.75} />
        </LinkButton>
        <Button variant="outline" className={iconBtn} onClick={share} aria-label={t("feed.share")} title={t("feed.share")}>
          <Send strokeWidth={1.75} />
        </Button>
      </>
    ) : (
      <>
        <Button variant="sun" className="h-10 px-4 sm:px-5" onClick={() => setTab("services")}>
          {t("vendor.book")}
        </Button>
        <Button variant="outline" className={iconBtn} onClick={() => void write()} aria-label={t("vendor.write")} title={t("vendor.write")}>
          <MessageCircle strokeWidth={1.75} />
        </Button>
        {isClient && (
          <Button
            variant="outline"
            className={iconBtn}
            onClick={() => run(() => toggleFavorite(vendor.id))}
            aria-pressed={fav}
            aria-label={fav ? t("vendor.favorited") : t("vendor.favorite")}
            title={fav ? t("vendor.favorited") : t("vendor.favorite")}
          >
            <Heart className={cn(fav && "fill-[#ff3b5c] text-[#ff3b5c]")} strokeWidth={1.75} />
          </Button>
        )}
        <Button variant="outline" className={iconBtn} onClick={share} aria-label={t("feed.share")} title={t("feed.share")}>
          <Send strokeWidth={1.75} />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" className={iconBtn} aria-label={t("common.more")} title={t("common.more")} />}>
            <MoreHorizontal strokeWidth={1.75} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
            <DropdownMenuItem onClick={share} className="h-10 rounded-xl px-3">
              <Link2 className="size-4" />
              {t("feed.copyLink")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTab("reviews")} className="h-10 rounded-xl px-3">
              <MessageCircle className="size-4" />
              {t("reviews.title")}
            </DropdownMenuItem>
            {actor.role !== "admin" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => (isClient ? setReporting(true) : toast(t("vendor.onlyClients")))}
                  className="h-10 rounded-xl px-3 text-destructive"
                >
                  <Flag className="size-4" />
                  {t("mod.report")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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

        {/* Profile header: the avatar sits inside the cover; name, numbers and actions below */}
        <header>
          <div className="relative h-44 overflow-hidden rounded-[28px] surface-ink md:h-64">
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
            <span className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/10 to-transparent" aria-hidden />
            <div className="absolute bottom-4 left-4 size-22 overflow-hidden rounded-full bg-muted ring-4 ring-white/85 md:bottom-6 md:left-6 md:size-32">
              {vendor.cover ? (
                <Image src={vendor.cover} alt="" fill loading="eager" sizes="128px" className="object-cover" />
              ) : (
                <Monogram name={vendor.name} className="size-full rounded-full text-3xl" />
              )}
            </div>
          </div>

          <div className="px-1 md:px-6">
            <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="display min-w-0 text-[28px] md:text-[40px]">{vendor.name}</h1>
                {vendor.verified && <VerifiedSeal withLabel className="shrink-0" />}
              </div>
              <div className="hidden flex-wrap justify-end gap-2 md:flex">{actions()}</div>
            </div>
            {/* numbers right under the name, one slim row like on Instagram */}
            <dl className="mt-3 flex w-fit max-w-full items-center rounded-2xl bg-card px-1 py-1.5 ring-1 ring-foreground/[0.07] sm:rounded-full sm:py-1">
              <Count value={num(posts.length)} label={tn("profile.postsN", posts.length)} onClick={() => setTab("posts")} />
              <Count value={num(orders)} label={tn("profile.ordersN", orders)} />
              <Count
                value={vendor.rating ? vendor.rating.toFixed(1) : "—"}
                label={t("profile.rating")}
                hideLabel
                icon={<Star className="size-3.5 fill-gold text-gold" strokeWidth={1.5} aria-hidden />}
              />
              <Count value={num(vendor.reviewsCount)} label={tn("profile.reviewsN", vendor.reviewsCount)} onClick={() => setTab("reviews")} />
            </dl>
            <div className="mt-5 flex flex-wrap gap-1.5 md:hidden">{actions()}</div>

            <div className="mt-7 md:mt-8">
              <div className="min-w-0">
                <p className="max-w-prose text-md leading-relaxed md:text-lg">{l(vendor.tagline)}</p>
                {l(vendor.description) && (
                  <p className="mt-2 line-clamp-3 max-w-prose text-sm leading-relaxed text-text-secondary">{l(vendor.description)}</p>
                )}
                {specFacts(vendor.category, vendor.specs, 3, { prices: !pricesHidden }).length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {specFacts(vendor.category, vendor.specs, 3, { prices: !pricesHidden }).map((f) => (
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

      {tab === "services" && <ServicesTab vendor={vendor} offers={offers} isOwner={isOwner} onBook={book} onAsk={askPrice} />}

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
          "bottom-above-tabbar fixed inset-x-3 z-30 mx-auto max-w-md rounded-[26px] bg-card/90 px-4 py-2.5 shadow-[0_8px_28px_rgb(13_26_47/0.14)] backdrop-blur-xl lg:hidden",
          (tab !== "services" || isOwner) && "hidden",
        )}
      >
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div className="text-sm tabular-nums">
            {pricesHidden ? (
              <button type="button" onClick={() => askPrice()} className="font-medium text-primary">
                {t("vendor.askPrice")}
              </button>
            ) : (
              <>
                <span className="text-muted-foreground">{t("common.from")} </span>
                <span className="font-medium">{money(minPrice)}</span>
              </>
            )}
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

function Count({
  value,
  label,
  icon,
  hideLabel,
  onClick,
}: {
  value: string;
  label: string;
  icon?: React.ReactNode;
  hideLabel?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      title={label}
      className={cn(
        "relative flex min-w-0 flex-col items-center rounded-full px-3 text-sm whitespace-nowrap sm:h-7 sm:flex-row sm:gap-1",
        "[&:not(:first-child)]:before:absolute [&:not(:first-child)]:before:inset-y-1.5 [&:not(:first-child)]:before:left-0 [&:not(:first-child)]:before:w-px [&:not(:first-child)]:before:bg-foreground/[0.1]",
        onClick && "transition-colors hover:bg-foreground/[0.05]",
      )}
    >
      <dt className="sr-only">{label}</dt>
      <dd className="flex items-center gap-1 font-medium tabular-nums">
        {icon}
        {value}
      </dd>
      <span className={cn("text-[11px] leading-tight text-text-secondary sm:text-xs", hideLabel && "sm:hidden")} aria-hidden>
        {label}
      </span>
    </Tag>
  );
}
