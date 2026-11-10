"use client";

import { Bookmark, Heart } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { Monogram, VerifiedSeal } from "@/components/vendor/badges";
import { toggleLike, toggleSave } from "@/lib/data/actions";
import type { FeedItem } from "@/lib/data/feed";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

export function useFeedActions() {
  const { t } = useI18n();
  const actor = useActor();
  const guard = (fn: () => void) => () => {
    if (actor.role !== "client") return toast(t("feed.loginToAct"));
    fn();
  };
  return {
    like: (postId: string) => guard(() => toggleLike(actor, postId))(),
    save: (postId: string) => guard(() => toggleSave(actor, postId))(),
  };
}

/** Masonry tile: the photo leads, the vendor and actions show on hover (always on touch) */
export function PostCard({ item, onOpen, priority }: { item: FeedItem; onOpen: (id: string) => void; priority?: boolean }) {
  const { t, num } = useI18n();
  const { like, save } = useFeedActions();
  const { post, vendor } = item;
  return (
    <article className="group relative mb-3 break-inside-avoid sm:mb-4">
      <button
        type="button"
        onClick={() => onOpen(post.id)}
        className="relative block w-full overflow-hidden rounded-2xl bg-muted outline-offset-4"
        style={{ aspectRatio: `1 / ${post.ratio}` }}
        aria-label={vendor.name}
      >
        <Image
          src={post.photos[0]}
          alt=""
          fill
          loading={priority ? "eager" : "lazy"}
          sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
        />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        {post.photos.length > 1 && (
          <span className="absolute top-3 left-3 flex gap-0.5" aria-hidden>
            {post.photos.slice(0, 4).map((p, i) => (
              <span key={p} className={cn("h-1 w-3 rounded-full", i === 0 ? "bg-white" : "bg-white/50")} />
            ))}
          </span>
        )}
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 max-lg:hidden">
        <span className="flex min-w-0 items-center gap-2 text-sm text-white">
          <Monogram name={vendor.name} className="size-7 rounded-full text-xs" />
          <span className="truncate">{vendor.name}</span>
        </span>
      </div>
      <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 max-lg:hidden">
        <IconAction active={item.saved} label={item.saved ? t("feed.saved") : t("feed.save")} onClick={() => save(post.id)}>
          <Bookmark className={cn("size-4", item.saved && "fill-current")} strokeWidth={1.75} />
        </IconAction>
      </div>

      {/* caption row (always visible, quiet) */}
      <div className="mt-2 flex items-center justify-between gap-2 px-0.5">
        <button type="button" onClick={() => onOpen(post.id)} className="flex min-w-0 items-center gap-1.5 text-left text-sm">
          <span className="truncate text-foreground">{vendor.name}</span>
          {vendor.verified && <VerifiedSeal className="[&_svg]:size-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => like(post.id)}
          aria-pressed={item.liked}
          aria-label={t("feed.like")}
          className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums transition-colors hover:text-foreground"
        >
          <Heart className={cn("size-3.5", item.liked && "fill-primary text-primary")} strokeWidth={1.75} />
          {num(item.likes)}
        </button>
      </div>
    </article>
  );
}

export function IconAction({
  children,
  label,
  active,
  onClick,
  className,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-9 items-center justify-center rounded-full bg-card/95 text-foreground shadow-soft backdrop-blur transition-colors hover:bg-card active:scale-[0.97]",
        active && "text-primary",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Masonry({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4 2xl:columns-5", className)}>{children}</div>;
}
