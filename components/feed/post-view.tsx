"use client";

/** One full-screen post of the viewer: photos, caption, booking bar, action rail */
import { Bookmark, ChevronLeft, ChevronRight, Flag, GalleryVerticalEnd, Heart, MessageCircle, Send, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Monogram, VerifiedSeal } from "@/components/vendor/badges";
import { ReportForm } from "@/components/feed/report-form";
import { deletePost, ensureConversation, toggleLike } from "@/lib/data/actions";
import { specFacts } from "@/lib/data/specs";
import { CITIES } from "@/lib/data/seed/catalog";
import { usePostCard } from "@/lib/data/views/feed";
import type { Post } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useFeedActions } from "./post-card";
import { BottomSheet, ReviewsSheet } from "./post-sheets";
import { routes } from "@/lib/routes";
import { useAction } from "@/lib/data/use-action";

/** Unsplash photos are re-cropped to the tall viewer frame; other sources are shown as they are */
/** The photo as shot: drop any server-side crop so the viewer shows the whole frame */
function whole(src: string) {
  if (!src.startsWith("https://images.unsplash.com/")) return src;
  const u = new URL(src);
  u.searchParams.set("w", "1200");
  u.searchParams.delete("h");
  u.searchParams.delete("fit");
  return u.toString();
}

/** One publication on its own screen */
export function PostView({
  post,
  near,
  similarTo: similarName,
  onSimilar,
  registerSheet,
}: {
  post: Post;
  /** on screen or next to it → load photos eagerly */
  near: boolean;
  similarTo?: string;
  onSimilar: (post: Post, vendorName: string) => void;
  registerSheet: (close: (() => void) | null) => void;
}) {
  const { t, tn, l, money, num } = useI18n();
  const router = useRouter();
  const actor = useActor();
  const { save } = useFeedActions();
  const card = usePostCard(post, actor);
  const [slide, setSlide] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [sheet, setSheet] = useState<"reviews" | "report" | null>(null);
  useEffect(() => {
    registerSheet(sheet ? () => setSheet(null) : null);
    return () => {
      if (sheet) registerSheet(null);
    };
  }, [sheet, registerSheet]);
  const [burst, setBurst] = useState(0);
  const { run } = useAction();
  const strip = useRef<HTMLDivElement>(null);
  if (!card) return null;

  const { item, offer, orders, categoryName, priceFrom } = card;
  const vendor = item.vendor;
  const facts = specFacts(vendor.category, vendor.specs, 2).map((f) => l(f));
  const photos = post.photos;
  const price = offer ? offer.price : priceFrom;

  const clientOnly = (fn: () => void) => () => (actor.role === "client" ? fn() : toast(t("feed.loginToAct")));
  const like = clientOnly(() => void run(() => toggleLike(post.id)));
  const likeOnce = clientOnly(() => {
    if (!item.liked) void run(() => toggleLike(post.id));
    setBurst((b) => b + 1);
  });

  const scrollStrip = (d: number) => {
    const el = strip.current;
    if (el) el.scrollTo({ left: (slide + d) * el.clientWidth, behavior: "smooth" });
  };

  return (
    <section className="relative flex h-dvh snap-start snap-always items-center justify-center md:py-4">
      <div className="relative h-full w-full overflow-hidden bg-neutral-900 md:aspect-[9/16] md:h-[calc(100dvh-32px)] md:w-auto md:rounded-2xl">
        {/* photos: swipe sideways */}
        <div
          ref={strip}
          onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          onDoubleClick={likeOnce}
          className="no-scrollbar absolute inset-0 flex snap-x snap-mandatory overflow-x-auto"
        >
          {photos.map((src, k) => (
            <div key={src} className="relative h-full w-full shrink-0 snap-center overflow-hidden">
              {/* the same photo, blurred, fills the empty bands around an uncropped frame */}
              <Image
                src={whole(src)}
                alt=""
                fill
                aria-hidden
                loading={near && k === 0 ? "eager" : "lazy"}
                sizes="(min-width: 768px) 520px, 100vw"
                className="scale-110 object-cover opacity-60 blur-2xl"
                draggable={false}
              />
              <Image
                src={whole(src)}
                alt=""
                fill
                loading={near && k === 0 ? "eager" : "lazy"}
                sizes="(min-width: 768px) 520px, 100vw"
                className="object-contain"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {burst > 0 && (
          <Heart
            key={burst}
            // centred by the like-burst keyframes (transform: translate(-50%,-50%)); a Tailwind translate here would add up
            className="pointer-events-none absolute top-1/2 left-1/2 size-24 fill-white text-white drop-shadow-lg"
            style={{ animation: "like-burst 700ms var(--ease-out-soft) both" }}
            aria-hidden
          />
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-black/80 via-black/35 to-transparent" />

        {/* top: carousel position and the «similar» trail */}
        <div className="pointer-events-none absolute inset-x-0 top-[max(20px,env(safe-area-inset-top))] flex flex-col items-center gap-2 px-16 md:top-4">
          {photos.length > 1 && (
            <div className="flex gap-1" aria-hidden>
              {photos.map((p, k) => (
                <span key={p} className={cn("h-1 rounded-full transition-all", k === slide ? "w-4 bg-white" : "w-1.5 bg-white/50")} />
              ))}
            </div>
          )}
          {similarName && (
            <span className="truncate text-xs text-white/80">{t("feed.similarTo", { name: similarName })}</span>
          )}
        </div>

        {photos.length > 1 && (
          <>
            {slide > 0 && <SlideBtn side="left" onClick={() => scrollStrip(-1)} label={t("common.back")} />}
            {slide < photos.length - 1 && <SlideBtn side="right" onClick={() => scrollStrip(1)} label={t("feed.loadMore")} />}
          </>
        )}

        {/* right rail */}
        <div className="absolute right-2 bottom-[calc(120px+env(safe-area-inset-bottom))] z-10 flex flex-col items-center gap-4">
          <RailBtn label={t("feed.like")} active={item.liked} onClick={like} count={num(item.likes)}>
            <Heart className={cn("size-7", item.liked && "fill-[#ff3b5c] text-[#ff3b5c]")} strokeWidth={1.75} />
          </RailBtn>
          <RailBtn label={t("reviews.title")} onClick={() => setSheet("reviews")} count={num(vendor.reviewsCount)}>
            <Star className="size-7" strokeWidth={1.75} />
          </RailBtn>
          <RailBtn label={item.saved ? t("feed.saved") : t("feed.save")} active={item.saved} onClick={() => save(post.id)}>
            <Bookmark className={cn("size-7", item.saved && "fill-white")} strokeWidth={1.75} />
          </RailBtn>
          <RailBtn
            label={t("feed.share")}
            onClick={() => {
              void navigator.clipboard?.writeText(`${location.origin}/vendors?post=${post.id}`).catch(() => {});
              toast.success(t("feed.copied"));
            }}
          >
            <Send className="size-6" strokeWidth={1.75} />
          </RailBtn>
          <RailBtn label={t("feed.similarShow")} onClick={() => onSimilar(post, vendor.name)} count={t("feed.similar")}>
            <GalleryVerticalEnd className="size-6" strokeWidth={1.75} />
          </RailBtn>
          {actor.id !== vendor.ownerId && actor.role !== "admin" && (
            <RailBtn label={t("mod.report")} onClick={clientOnly(() => setSheet("report"))}>
              <Flag className="size-6" strokeWidth={1.75} />
            </RailBtn>
          )}
          {actor.id === vendor.ownerId && (
            <RailBtn
              label={t("vcab.deletePost")}
              onClick={() => {
                if (!window.confirm(t("owner.deletePostConfirm"))) return;
                void run(() => deletePost(post.id), { success: t("vcab.postDeleted") });
              }}
            >
              <Trash2 className="size-6" strokeWidth={1.75} />
            </RailBtn>
          )}
        </div>

        {/* bottom: who, what, how much */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-3 pr-16 pb-[max(16px,env(safe-area-inset-bottom))] pl-4 *:pointer-events-auto">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link href={routes.vendor(vendor.slug)} className="flex min-w-0 items-center gap-2.5">
              <Monogram name={vendor.name} className="size-9 shrink-0 rounded-full text-xs ring-2 ring-white/80" />
              <span className="truncate text-sm font-medium">{vendor.name}</span>
              {vendor.verified && <VerifiedSeal className="[&_svg]:size-3.5" />}
            </Link>
            {actor.id !== vendor.ownerId && (
              <button
                type="button"
                onClick={clientOnly(() => router.push(offer ? routes.book(offer.id) : routes.vendor(vendor.slug, "services")))}
                className="h-8 shrink-0 rounded-full bg-sun px-3.5 text-xs font-medium text-sun-foreground transition-colors hover:bg-[color-mix(in_oklch,var(--sun),black_7%)]"
              >
                {t("feed.book")}
              </button>
            )}
          </div>

          {/* trust line instead of followers: rating from real clients and orders done */}
          <button
            type="button"
            onClick={() => setSheet("reviews")}
            className="-mt-1 flex w-fit items-center gap-1.5 text-xs text-white/90 tabular-nums"
            aria-label={t("reviews.title")}
          >
            <Star className="size-3.5 fill-gold text-gold" strokeWidth={1.5} aria-hidden />
            <span className="font-medium text-white">{vendor.rating ? vendor.rating.toFixed(1) : "—"}</span>
            <span className="text-white/70 underline decoration-white/30 underline-offset-2">{tn("reviews.count", vendor.reviewsCount)}</span>
            <span className="text-white/50">·</span>
            <span>{tn("feed.orders", orders)}</span>
          </button>

          <button
            type="button"
            onClick={() => setExpanded((x) => !x)}
            className={cn("text-left text-sm leading-relaxed text-white/95", !expanded && "line-clamp-2")}
          >
            {l(post.caption)}
          </button>
          <p className="-mt-1.5 text-xs text-white/65">
            {[l(categoryName), l(CITIES[vendor.city]), ...facts].join(" · ")}
          </p>

          <div className="flex items-center gap-2 rounded-full bg-white/12 p-1.5 pl-4 backdrop-blur-md">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs text-white/75">{offer ? l(offer.title) : t("feed.profile")}</span>
              <span className="block text-sm font-medium tabular-nums">{t("feed.fromPrice", { amount: money(price) })}</span>
            </span>
            {actor.id !== vendor.ownerId && (
              <button
              type="button"
              onClick={clientOnly(() => void run(() => ensureConversation(vendor.id), { onSuccess: (id) => router.push(routes.chat(id)) }))}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3.5 text-sm text-white transition-colors hover:bg-white/25"
            >
              <MessageCircle className="size-4" strokeWidth={1.75} />
              {t("feed.message")}
            </button>
            )}
          </div>
        </div>

        {sheet === "reviews" && <ReviewsSheet vendor={vendor} onClose={() => setSheet(null)} />}
        {sheet === "report" && (
          <BottomSheet title={t("mod.reportTitle")} onClose={() => setSheet(null)}>
            <ReportForm target="post" targetId={post.id} onDone={() => setSheet(null)} />
          </BottomSheet>
        )}
      </div>
    </section>
  );
}

function RailBtn({
  children,
  label,
  count,
  active,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  count?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className="flex w-14 flex-col items-center gap-1 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-transform active:scale-90"
    >
      {children}
      {count !== undefined && <span className="text-[11px] leading-none font-medium tabular-nums">{count}</span>}
    </button>
  );
}

function SlideBtn({ side, onClick, label }: { side: "left" | "right"; onClick: () => void; label: string }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-[38%] hidden size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-neutral-900 shadow-soft md:flex",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}
