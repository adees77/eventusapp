"use client";

import { Eye, EyeOff, Heart } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { PageHeader, Segmented } from "@/components/panel";
import { setPostHidden } from "@/lib/data/actions";
import { likeCount } from "@/lib/data/feed";
import { useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

export default function AdminPosts() {
  const { t, l, num } = useI18n();
  const actor = useActor();
  const db = useDB((d) => d);
  const [f, setF] = useState<"recent" | "hidden">("recent");
  const posts = db.posts
    .filter((p) => (f === "hidden" ? p.hidden : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 60);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("profile.tabPosts")} subtitle={t("acab.postsHint", { n: db.posts.length })} />
      <Segmented
        value={f}
        onChange={setF}
        options={[
          { value: "recent", label: t("acab.recent") },
          { value: "hidden", label: `${t("admin.hidden")} · ${db.posts.filter((p) => p.hidden).length}` },
        ]}
      />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
        {posts.map((p) => (
          <li key={p.id} className={cn("overflow-hidden rounded-2xl border border-border bg-card", p.hidden && "opacity-60")}>
            <div className="relative aspect-square bg-muted">
              <Image src={p.photos[0]} alt="" fill sizes="240px" className="object-cover" />
            </div>
            <div className="p-3">
              <div className="truncate text-xs font-medium">{db.vendors.find((v) => v.id === p.vendorId)?.name}</div>
              <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">{l(p.caption)}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                  <Heart className="size-3" />
                  {num(likeCount(db, p))}
                </span>
                <button
                  type="button"
                  onClick={() => setPostHidden(actor, p.id, !p.hidden)}
                  className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-foreground"
                >
                  {p.hidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  {p.hidden ? t("admin.show") : t("admin.hide")}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
