"use client";

import { Layers } from "lucide-react";
import Image from "next/image";
import type { Post } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";

/** Vendor page, «Публикации»: the post grid, the same for the owner as for clients (new posts come from the «+» tab) */
export function PostsTab({ posts, onOpen }: { posts: Post[]; onOpen: (postId: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="container-app">
      {posts.length ? (
        <ul className="-mx-4 grid grid-cols-3 gap-0.5 sm:mx-0">
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
