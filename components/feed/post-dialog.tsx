"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Flag,
  GalleryVerticalEnd,
  Heart,
  MessageCircle,
  Send,
  Star,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Monogram, VerifiedSeal } from "@/components/vendor/badges";
import { ReportForm } from "@/components/feed/report-form";
import { deletePost, ensureConversation, toggleLike } from "@/lib/data/actions";
import { feedItem, likeCount, ordersDone, viewerSequence } from "@/lib/data/feed";
import { specFacts } from "@/lib/data/specs";
import { ReviewComposer, ReviewList, ReviewSummary, useVendorReviews } from "@/components/vendor/reviews";
import { activeOffers, minPrice } from "@/lib/data/queries";
import { CITIES } from "@/lib/data/seed/catalog";
import { getDB, useDB } from "@/lib/data/store";
import type { DB, Post, Vendor } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useFeedActions } from "./post-card";

const STEP = 3;

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

/** Posts most like this one: same category first, then same city, then the most liked */
function similarTo(db: DB, post: Post, exclude: Set<string>): string[] {
  const vendor = db.vendors.find((v) => v.id === post.vendorId);
  return db.posts
    .filter((p) => !p.hidden && !exclude.has(p.id) && p.category === post.category)
    .map((p) => {
      const v = db.vendors.find((x) => x.id === p.vendorId);
      const s = (v && vendor && v.city === vendor.city ? 2 : 0) + (p.vendorId !== post.vendorId ? 1 : 0) + Math.log10(likeCount(db, p) + 10);
      return { id: p.id, s };
    })
    .sort((a, b) => b.s - a.s)
    .map((x) => x.id);
}

/**
 * Full-screen post viewer, one publication per screen (like Reels / Shorts):
 * the photo fills the frame, the caption and booking bar sit over it at the
 * bottom, and the actions run down the right edge. Scrolling snaps to the next
 * post of the list it was opened from (`order`).
 */
export function PostDialog({
  postId,
  order,
  onOpenChange,
}: {
  postId: string | null;
  /** post ids of the list the viewer was opened from, in display order */
  order?: string[];
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const posts = useDB((d) => d.posts);
  // the order is frozen when a post is opened: a like must not reshuffle what is under the finger
  const [view, setView] = useState<{ id: string | null; seq: string[]; n: number; similar: Record<string, string> }>({
    id: null,
    seq: [],
    n: STEP,
    similar: {},
  });

  const byId = new Map(posts.map((p) => [p.id, p]));
  const seq = view.seq.flatMap((id) => {
    const p = byId.get(id);
    return p && (!p.hidden || id === postId) ? [p] : [];
  });
  const shown = seq.slice(0, view.n);
  const open = !!postId && shown.length > 0;

  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  if (view.id !== postId) {
    setView({ id: postId, seq: postId ? viewerSequence(order ?? [], postId) : [], n: STEP, similar: {} });
    setActive(0);
  }

  useEffect(() => {
    scroller?.scrollTo({ top: 0 });
  }, [postId, scroller]);

  // nothing left to show (the owner deleted the last post, a stale ?post= link): tell the parent so it clears its selection
  useEffect(() => {
    if (postId && !open) onOpenChange(false);
  }, [postId, open, onOpenChange]);

  // an open comments/reviews sheet: Escape and the arrow keys belong to it, not to the whole viewer
  const sheetCloser = useRef<(() => void) | null>(null);
  const registerSheet = useCallback((close: (() => void) | null) => {
    sheetCloser.current = close;
  }, []);

  const onScroll = useCallback(() => {
    if (!scroller) return;
    const i = Math.round(scroller.scrollTop / scroller.clientHeight);
    setActive(i);
    // keep a couple of screens rendered ahead of the finger
    setView((v) => (i + 2 >= v.n ? { ...v, n: v.n + STEP } : v));
  }, [scroller]);

  const goTo = useCallback(
    (i: number) => {
      if (!scroller) return;
      scroller.scrollTo({ top: i * scroller.clientHeight, behavior: "smooth" });
    },
    [scroller],
  );

  /** «Показать похожее»: the posts right after the current one become similar ones, and we scroll to them */
  function showSimilar(post: Post, vendorName: string) {
      // indexes of what is actually rendered (deleted / hidden posts are already filtered out)
      const ids = seq.map((p) => p.id);
      const i = ids.indexOf(post.id);
      const head = ids.slice(0, i + 1);
      const similar = similarTo(getDB(), post, new Set(head));
      if (!similar.length) return toast(t("feed.similarNone"));
      const rest = ids.slice(i + 1).filter((id) => !similar.includes(id));
      const tag = Object.fromEntries(similar.map((id) => [id, vendorName]));
      setView((v) => ({ ...v, seq: [...head, ...similar, ...rest], n: Math.max(v.n, i + 1 + STEP), similar: { ...v.similar, ...tag } }));
      requestAnimationFrame(() => goTo(i + 1));
  }

  function onKey(e: React.KeyboardEvent) {
    if (sheetCloser.current || (e.target as HTMLElement).closest("input, textarea")) return;
    if (e.key === "ArrowDown" || e.key === "j") {
      e.preventDefault();
      goTo(Math.min(active + 1, seq.length - 1));
    } else if (e.key === "ArrowUp" || e.key === "k") {
      e.preventDefault();
      goTo(Math.max(active - 1, 0));
    }
  }

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        // Escape / outside press with a sheet open closes the sheet only
        if (!next && sheetCloser.current) return sheetCloser.current();
        onOpenChange(next);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          className="fixed inset-0 z-50 bg-black text-white outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          onKeyDown={onKey}
        >
          <DialogPrimitive.Title className="sr-only">{t("nav.feed")}</DialogPrimitive.Title>
          <div
            ref={setScroller}
            onScroll={onScroll}
            className="no-scrollbar h-dvh snap-y snap-mandatory overflow-y-auto overscroll-contain"
          >
            {shown.map((p, k) => (
              <PostView
                key={p.id}
                post={p}
                near={Math.abs(k - active) <= 1}
                similarTo={view.similar[p.id]}
                onSimilar={showSimilar}
                registerSheet={registerSheet}
              />
            ))}
          </div>

          <DialogPrimitive.Close
            aria-label={t("feed.close")}
            className="absolute top-[max(12px,env(safe-area-inset-top))] left-3 z-10 flex size-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur transition-colors hover:bg-black/50 md:top-5 md:left-5 md:bg-white/10 md:hover:bg-white/20"
          >
            <X className="size-5" strokeWidth={1.75} />
          </DialogPrimitive.Close>

          <div className="absolute top-1/2 right-6 hidden -translate-y-1/2 flex-col gap-3 md:flex">
            <NavBtn label={t("feed.prev")} disabled={active === 0} onClick={() => goTo(active - 1)}>
              <ChevronUp className="size-5" />
            </NavBtn>
            <NavBtn label={t("feed.next")} disabled={active >= seq.length - 1} onClick={() => goTo(active + 1)}>
              <ChevronDown className="size-5" />
            </NavBtn>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** One publication on its own screen */
function PostView({
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
  const db = useDB((d) => d);
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
  const strip = useRef<HTMLDivElement>(null);
  const item = feedItem(db, post, actor);
  if (!item) return null;

  const vendor = item.vendor;
  const offers = activeOffers(db, vendor.id);
  const offer = post.offerId ? offers.find((o) => o.id === post.offerId) : undefined;
  const orders = ordersDone(db, vendor);
  const facts = specFacts(vendor.category, vendor.specs, 2).map((f) => l(f));
  const photos = post.photos;
  const price = offer ? offer.price : minPrice(offers);

  const clientOnly = (fn: () => void) => () => (actor.role === "client" ? fn() : toast(t("feed.loginToAct")));
  const like = clientOnly(() => toggleLike(actor, post.id));
  const likeOnce = clientOnly(() => {
    if (!item.liked) toggleLike(actor, post.id);
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
                deletePost(actor, post.id);
                toast(t("vcab.postDeleted"));
              }}
            >
              <Trash2 className="size-6" strokeWidth={1.75} />
            </RailBtn>
          )}
        </div>

        {/* bottom: who, what, how much */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-3 pr-16 pb-[max(16px,env(safe-area-inset-bottom))] pl-4 *:pointer-events-auto">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link href={`/vendors/${vendor.slug}`} className="flex min-w-0 items-center gap-2.5">
              <Monogram name={vendor.name} className="size-9 shrink-0 rounded-full text-xs ring-2 ring-white/80" />
              <span className="truncate text-sm font-medium">{vendor.name}</span>
              {vendor.verified && <VerifiedSeal className="[&_svg]:size-3.5" />}
            </Link>
            {actor.id !== vendor.ownerId && (
              <button
                type="button"
                onClick={clientOnly(() => router.push(offer ? `/book/${offer.id}` : `/vendors/${vendor.slug}?tab=services`))}
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
            {[l(db.categories.find((c) => c.id === vendor.category)?.name), l(CITIES[vendor.city]), ...facts].join(" · ")}
          </p>

          <div className="flex items-center gap-2 rounded-full bg-white/12 p-1.5 pl-4 backdrop-blur-md">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs text-white/75">{offer ? l(offer.title) : t("feed.profile")}</span>
              <span className="block text-sm font-medium tabular-nums">{t("feed.fromPrice", { amount: money(price) })}</span>
            </span>
            {actor.id !== vendor.ownerId && (
              <button
              type="button"
              onClick={clientOnly(() => router.push(`/messages/${ensureConversation(actor, vendor.id)}`))}
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

/** A plain sheet over the photo (report form) */
function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <>
      <button type="button" aria-label={t("feed.close")} onClick={onClose} className="absolute inset-0 z-20 animate-in bg-black/40 fade-in-0" />
      <div
        role="dialog"
        aria-label={title}
        className="absolute inset-x-0 bottom-0 z-20 flex max-h-[85%] animate-in flex-col rounded-t-3xl bg-card text-foreground duration-200 slide-in-from-bottom"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-medium">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("feed.close")}
            autoFocus
            className="-mr-1.5 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(16px,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </>
  );
}

/** Rating and reviews over the photo; rating is open only to clients who used the service */
function ReviewsSheet({ vendor, onClose }: { vendor: Vendor; onClose: () => void }) {
  const { t } = useI18n();
  const reviews = useVendorReviews(vendor.id);
  return (
    <>
      <button type="button" aria-label={t("feed.close")} onClick={onClose} className="absolute inset-0 z-20 animate-in bg-black/40 fade-in-0" />
      <div
        role="dialog"
        aria-label={t("reviews.title")}
        className="absolute inset-x-0 bottom-0 z-20 flex max-h-[80%] min-h-[55%] animate-in flex-col rounded-t-2xl bg-card text-foreground duration-200 slide-in-from-bottom"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-medium">{t("reviews.title")}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("feed.close")}
            autoFocus
            className="-mr-1.5 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4">
          <ReviewSummary vendor={vendor} reviews={reviews} className="pb-2" />
          <ReviewList reviews={reviews} limit={5} />
        </div>
        <div className="px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <ReviewComposer vendor={vendor} compact />
        </div>
      </div>
    </>
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

function NavBtn({ children, label, disabled, onClick }: { children: React.ReactNode; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
