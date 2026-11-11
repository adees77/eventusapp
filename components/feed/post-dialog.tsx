"use client";

import { ArrowUp, BadgeCheck, Bookmark, ChevronLeft, ChevronRight, Heart, Link2, MessageCircle, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Monogram, Rating, VerifiedSeal } from "@/components/vendor/badges";
import { addComment, deleteComment, ensureConversation, toggleFollow } from "@/lib/data/actions";
import { commentsOf, feedItem, viewerSequence } from "@/lib/data/feed";
import { can } from "@/lib/data/policies";
import { minPrice, activeOffers } from "@/lib/data/queries";
import { CITIES } from "@/lib/data/seed/catalog";
import { useDB } from "@/lib/data/store";
import type { Post, Vendor } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useFeedActions } from "./post-card";

const STEP = 3;

/**
 * Post viewer. Opens on the tapped post and keeps going: scrolling down walks
 * through the rest of the list the post was opened from (`order`).
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
  const [view, setView] = useState<{ id: string | null; seq: string[]; n: number }>({ id: null, seq: [], n: STEP });
  if (view.id !== postId) setView({ id: postId, seq: postId ? viewerSequence(order ?? [], postId) : [], n: STEP });

  const byId = new Map(posts.map((p) => [p.id, p]));
  const seq = view.seq.flatMap((id) => {
    const p = byId.get(id);
    return p && (!p.hidden || id === postId) ? [p] : [];
  });
  const shown = seq.slice(0, view.n);
  const open = !!postId && shown.length > 0;

  // callback refs: the dialog mounts its content in a portal after this component's first effects
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);
  const more = view.n < seq.length;
  useEffect(() => {
    if (!sentinel || !scroller) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setView((v) => ({ ...v, n: v.n + STEP })), {
      root: scroller,
      rootMargin: "900px",
    });
    io.observe(sentinel);
    return () => io.disconnect();
  }, [sentinel, scroller, view.n]);
  useEffect(() => {
    scroller?.scrollTo({ top: 0 });
  }, [postId, scroller]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] w-[min(96vw,1080px)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        <DialogTitle className="sr-only">{t("nav.feed")}</DialogTitle>
        <div ref={setScroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {shown.map((p, k) => (
            <PostView key={p.id} post={p} first={k === 0} />
          ))}
          {more && <div ref={setSentinel} className="h-px" aria-hidden />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** One full post: photo carousel on the left; vendor, caption, actions and comments on the right */
function PostView({ post, first }: { post: Post; first: boolean }) {
  const { t, l, money, tn, date } = useI18n();
  const router = useRouter();
  const actor = useActor();
  const { like, save } = useFeedActions();
  const [slide, setSlide] = useState(0);
  const db = useDB((d) => d);
  const item = feedItem(db, post, actor);
  if (!item) return null;

  const vendor = item.vendor;
  const offers = activeOffers(db, vendor.id);
  const offer = post.offerId ? offers.find((o) => o.id === post.offerId) : undefined;
  const following = db.follows.some((f) => f.userId === actor.id && f.vendorId === vendor.id);
  const photos = post.photos;
  const i = Math.min(slide, Math.max(0, photos.length - 1));
  const go = (d: number) => setSlide((s) => (s + d + photos.length) % photos.length);

  const clientOnly = (fn: () => void) => () => (actor.role === "client" ? fn() : toast(t("feed.loginToAct")));

  return (
    <article className={cn("grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]", !first && "border-t border-border")}>
      <div className="relative bg-foreground/95 md:min-h-[520px]">
        <div className="relative mx-auto h-full w-full" style={{ aspectRatio: `1 / ${post.ratio}`, maxHeight: "80dvh" }}>
          <Image
            key={photos[i]}
            src={photos[i]}
            alt=""
            fill
            loading={first ? "eager" : "lazy"}
            sizes="(min-width: 768px) 560px, 96vw"
            className="animate-rise object-contain"
          />
        </div>
        {photos.length > 1 && (
          <>
            <SlideButton side="left" onClick={() => go(-1)} label={t("common.back")} />
            <SlideButton side="right" onClick={() => go(1)} label={t("feed.loadMore")} />
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1" aria-hidden>
              {photos.map((p, k) => (
                <span key={p} className={cn("h-1 rounded-full transition-all", k === i ? "w-4 bg-white" : "w-1.5 bg-white/50")} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex min-w-0 flex-col p-5 md:p-6">
        <div className={cn("flex items-center gap-3", first && "pr-8")}>
          <Link href={`/vendors/${vendor.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
            <Monogram name={vendor.name} className="size-10 rounded-full text-sm" />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-md font-medium">{vendor.name}</span>
                {vendor.verified && <VerifiedSeal />}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {l(db.categories.find((c) => c.id === vendor.category)?.name)} · {l(CITIES[vendor.city])}
              </span>
            </span>
          </Link>
          <Button variant={following ? "outline" : "default"} className="h-9 px-4" onClick={clientOnly(() => toggleFollow(actor, vendor.id))}>
            {following ? t("feed.unfollow") : t("feed.follow")}
          </Button>
        </div>

        <p className="mt-5 text-md leading-relaxed">{l(post.caption)}</p>
        <p className="mt-2 text-xs text-muted-foreground">{date(post.createdAt.slice(0, 10), "d MMMM")}</p>

        <div className="mt-5 flex items-center gap-1 border-y border-border py-2">
          <ActionBtn active={item.liked} onClick={() => like(post.id)} label={t("feed.like")}>
            <Heart className={cn("size-5", item.liked && "fill-primary text-primary")} strokeWidth={1.5} />
            <span className="text-sm tabular-nums">{tn("feed.likes", item.likes)}</span>
          </ActionBtn>
          <ActionBtn active={item.saved} onClick={() => save(post.id)} label={t("feed.save")}>
            <Bookmark className={cn("size-5", item.saved && "fill-current text-primary")} strokeWidth={1.5} />
          </ActionBtn>
          <ActionBtn
            onClick={() => {
              void navigator.clipboard?.writeText(`${location.origin}/vendors?post=${post.id}`).catch(() => {});
              toast.success(t("feed.copied"));
            }}
            label={t("feed.share")}
          >
            <Link2 className="size-5" strokeWidth={1.5} />
          </ActionBtn>
        </div>

        <div className="mt-5 rounded-xl border border-border p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-sm">{offer ? l(offer.title) : t("feed.profile")}</span>
            <span className="shrink-0 text-sm font-medium tabular-nums">
              {t("feed.fromPrice", { amount: money(offer ? offer.price : minPrice(offers)) })}
            </span>
          </div>
          <Rating value={vendor.rating} count={vendor.reviewsCount} className="mt-1 text-xs" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-10"
              onClick={clientOnly(() => router.push(`/messages/${ensureConversation(actor, vendor.id)}`))}
            >
              <MessageCircle strokeWidth={1.75} />
              {t("feed.message")}
            </Button>
            <Button
              className="h-10"
              onClick={clientOnly(() => router.push(offer ? `/book/${offer.id}` : `/vendors/${vendor.slug}?tab=services`))}
            >
              {t("feed.book")}
            </Button>
          </div>
        </div>

        <Comments post={post} vendor={vendor} />
      </div>
    </article>
  );
}

/** Comments under a post. Writing is open only to clients who had a finished deal with the vendor. */
function Comments({ post, vendor }: { post: Post; vendor: Vendor }) {
  const { t, date } = useI18n();
  const actor = useActor();
  const list = useDB((db) => commentsOf(db, post.id));
  const allowed = useDB((db) => can.commentPost(actor, db, vendor.id));
  const [all, setAll] = useState(false);
  const [text, setText] = useState("");
  const visible = all ? list : list.slice(-3);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    addComment(actor, post.id, text);
    setText("");
    setAll(true);
  }

  return (
    <section className="mt-6">
      <h3 className="flex items-baseline gap-2 text-sm font-medium">
        {t("feed.comments")}
        {list.length > 0 && <span className="text-xs font-normal text-muted-foreground tabular-nums">{list.length}</span>}
      </h3>

      {list.length > visible.length && (
        <button type="button" onClick={() => setAll(true)} className="mt-2 text-xs text-primary hover:text-primary-hover">
          {t("feed.showAllComments", { n: list.length })}
        </button>
      )}

      {visible.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3.5">
          {visible.map((c) => (
            <li key={c.id} className="group/c text-sm">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-medium">{c.author}</span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground" title={t("feed.realClientHint")}>
                  <BadgeCheck className="size-3.5 text-gold" strokeWidth={1.75} />
                  {t("feed.realClient")}
                </span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">{date(c.createdAt.slice(0, 10), "d MMM")}</span>
                {(c.userId === actor.id || actor.role === "admin") && (
                  <button
                    type="button"
                    onClick={() => deleteComment(actor, c.id)}
                    aria-label={t("feed.commentDelete")}
                    title={t("feed.commentDelete")}
                    className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.75} />
                  </button>
                )}
              </div>
              <p className="mt-0.5 leading-relaxed text-text-secondary">{c.text}</p>
            </li>
          ))}
        </ul>
      )}

      {allowed ? (
        <form onSubmit={submit} className="mt-4 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            placeholder={t("feed.commentPlaceholder")}
            aria-label={t("feed.commentPlaceholder")}
            className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-card px-3.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label={t("feed.commentSend")}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-40"
          >
            <ArrowUp className="size-4" />
          </button>
        </form>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {list.length === 0 ? `${t("feed.noComments")}. ` : ""}
          {t("feed.commentsRule")}
        </p>
      )}
    </section>
  );
}

function SlideButton({ side, onClick, label }: { side: "left" | "right"; onClick: () => void; label: string }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-foreground shadow-soft",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

function ActionBtn({
  children,
  onClick,
  label,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className="flex h-10 items-center gap-2 rounded-lg px-2.5 text-text-secondary transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}
