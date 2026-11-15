"use client";

import { Layers, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Post } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { routes } from "@/lib/routes";

/** Vendor page, «Публикации»: the post grid (the owner also gets «new post») */
export function PostsTab({ posts, isOwner, onOpen }: { posts: Post[]; isOwner: boolean; onOpen: (postId: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="container-app">
      {posts.length || isOwner ? (
        <ul className="-mx-4 grid grid-cols-3 gap-0.5 sm:mx-0">
          {isOwner && (
            <li>
              <Link
                href={routes.createPost}
                className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 bg-cream text-sm text-text-secondary transition-colors hover:bg-secondary hover:text-primary"
              >
                <Plus className="size-6" strokeWidth={1.5} />
                {t("vcab.newPost")}
              </Link>
            </li>
          )}
          {posts.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onOpen(p.id)}
                className="group relative block aspect-[4/5] w-full overflow-hidden bg-muted"
              >
                <Image
                  src={p.photos[0]}
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 400px, 33vw"
                  className="object-cover"
                />
                <span className="pointer-events-none absolute inset-0 bg-black/25 opacity-0 transition-opacity group-hover:opacity-100" />
                {p.photos.length > 1 && <Layers className="absolute top-2 right-2 size-4 text-white drop-shadow" strokeWidth={1.75} />}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-16 text-center text-sm text-text-secondary">{t("profile.noPosts")}</p>
      )}
    </div>
  );
}
