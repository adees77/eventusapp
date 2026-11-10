"use client";

import { Bookmark, ChevronLeft, ChevronRight, Heart, Link2, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Monogram, Rating, VerifiedSeal } from "@/components/vendor/badges";
import { ensureConversation, toggleFollow } from "@/lib/data/actions";
import { feedItem, similarPosts } from "@/lib/data/feed";
import { minPrice, activeOffers } from "@/lib/data/queries";
import { CITIES } from "@/lib/data/seed/catalog";
import { useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";
import { Masonry, PostCard, useFeedActions } from "./post-card";

/** Full post: photo carousel on the left, vendor, caption and actions on the right */
export function PostDialog({
  postId,
  onOpenChange,
  onOpen,
}: {
  postId: string | null;
  onOpenChange: (open: boolean) => void;
  onOpen: (id: string) => void;
}) {
  const { t, l, money, tn, date } = useI18n();
  const router = useRouter();
  const actor = useActor();
  const { like, save } = useFeedActions();
  const [slide, setSlide] = useState({ post: postId, i: 0 });
  const db = useDB((d) => d);
  const post = postId ? db.posts.find((p) => p.id === postId) : undefined;
  const item = post ? feedItem(db, post, actor) : null;
  if (slide.post !== postId) setSlide({ post: postId, i: 0 });

  const open = !!item;
  const vendor = item?.vendor;
  const offers = vendor ? activeOffers(db, vendor.id) : [];
  const offer = post?.offerId ? offers.find((o) => o.id === post.offerId) : undefined;
  const following = !!vendor && db.follows.some((f) => f.userId === actor.id && f.vendorId === vendor.id);
  const similar = post ? similarPosts(db, post, actor, 10) : [];
  const photos = post?.photos ?? [];
  const i = Math.min(slide.i, Math.max(0, photos.length - 1));
  const go = (d: number) => setSlide((s) => ({ ...s, i: (s.i + d + photos.length) % photos.length }));

  const clientOnly = (fn: () => void) => () => (actor.role === "client" ? fn() : toast(t("feed.loginToAct")));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[min(96vw,1080px)] max-w-none gap-0 overflow-y-auto p-0 sm:max-w-none">
        {item && vendor && post && (
          <>
            <DialogTitle className="sr-only">{vendor.name}</DialogTitle>
            <div className="grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              <div className="relative bg-foreground/95 md:min-h-[560px]">
                <div className="relative mx-auto h-full w-full" style={{ aspectRatio: `1 / ${post.ratio}`, maxHeight: "80dvh" }}>
                  <Image
                    key={photos[i]}
                    src={photos[i]}
                    alt=""
                    fill
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
                <div className="flex items-center gap-3">
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
                  <Button
                    variant={following ? "outline" : "default"}
                    className="h-9 px-4"
                    onClick={clientOnly(() => toggleFollow(actor, vendor.id))}
                  >
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
              </div>
            </div>

            {similar.length > 0 && (
              <div className="border-t border-border p-5 md:p-6">
                <h3 className="mb-4 text-base font-medium">{t("feed.similar")}</h3>
                <Masonry className="lg:columns-4 2xl:columns-4">
                  {similar.map((s) => (
                    <PostCard key={s.post.id} item={s} onOpen={onOpen} />
                  ))}
                </Masonry>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
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
