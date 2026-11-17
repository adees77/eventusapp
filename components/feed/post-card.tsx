"use client";

import { Heart, Layers } from "lucide-react";
import Image from "next/image";
import { VerifiedSeal } from "@/components/vendor/badges";
import type { FeedItem } from "@/lib/data/feed";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Grid tile (Instagram-like): a flat 4:5 rectangle, no rounding or gaps; vendor and likes show on hover */
export function PostCard({ item, onOpen, priority }: { item: FeedItem; onOpen: (id: string) => void; priority?: boolean }) {
  const { num } = useI18n();
  const { post, vendor } = item;
  return (
    <article className="group relative">
      <button
        type="button"
        onClick={() => onOpen(post.id)}
        className="relative block aspect-[4/5] w-full overflow-hidden bg-muted outline-offset-[-3px]"
        aria-label={vendor.name}
      >
        <Image
          src={post.photos[0]}
          alt=""
          fill
          loading={priority ? "eager" : "lazy"}
          sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 25vw, 33vw"
          className="object-cover"
        />
        <span className="pointer-events-none absolute inset-0 bg-black/35 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        {post.photos.length > 1 && <Layers className="absolute top-2 right-2 size-4 text-white drop-shadow md:size-5" strokeWidth={1.75} aria-hidden />}
        <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 max-lg:hidden">
          <span className="flex items-center gap-1.5 text-sm font-medium tabular-nums">
            <Heart className={cn("size-4", item.liked && "fill-current")} strokeWidth={2} />
            {num(item.likes)}
          </span>
          <span className="flex max-w-[85%] items-center gap-1 truncate text-xs text-white/85">
            {vendor.name}
            {vendor.verified && <VerifiedSeal className="[&_svg]:size-3" />}
          </span>
        </span>
      </button>
    </article>
  );
}

export function Masonry({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-3 gap-0.5 lg:grid-cols-4 2xl:grid-cols-5", className)}>{children}</div>;
}
