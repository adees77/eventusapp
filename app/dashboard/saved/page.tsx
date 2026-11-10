"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Masonry, PostCard } from "@/components/feed/post-card";
import { Empty, PageHeader, Segmented } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { VendorCard } from "@/components/vendor/vendor-card";
import { Monogram, VerifiedSeal } from "@/components/vendor/badges";
import { toggleFollow } from "@/lib/data/actions";
import { feedItem } from "@/lib/data/feed";
import { activeOffers, minPrice } from "@/lib/data/queries";
import { useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";

type Tab = "posts" | "vendors" | "following";

export default function SavedPage() {
  const { t, l } = useI18n();
  const actor = useActor();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("posts");
  const db = useDB((d) => d);
  const posts = db.saved
    .filter((s) => s.userId === actor.id)
    .flatMap((s) => {
      const p = db.posts.find((x) => x.id === s.postId);
      const it = p && feedItem(db, p, actor);
      return it ? [it] : [];
    });
  const vendors = db.favorites
    .filter((f) => f.userId === actor.id)
    .flatMap((f) => db.vendors.filter((v) => v.id === f.vendorId && !v.hidden));
  const following = db.follows.filter((f) => f.userId === actor.id).flatMap((f) => db.vendors.filter((v) => v.id === f.vendorId));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("cabinet.saved")} />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "posts", label: `${t("profile.tabPosts")} · ${posts.length}` },
          { value: "vendors", label: `${t("dashboard.favorites")} · ${vendors.length}` },
          { value: "following", label: `${t("feed.following")} · ${following.length}` },
        ]}
      />
      {tab === "posts" &&
        (posts.length ? (
          <Masonry className="lg:columns-4">
            {posts.map((it) => (
              <PostCard key={it.post.id} item={it} onOpen={(id) => router.push(`/vendors?post=${id}`)} />
            ))}
          </Masonry>
        ) : (
          <Empty action={<LinkButton href="/vendors">{t("nav.feed")}</LinkButton>}>{t("cabinet.noSaved")}</Empty>
        ))}
      {tab === "vendors" &&
        (vendors.length ? (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
            {vendors.map((v) => {
              const offers = activeOffers(db, v.id);
              return (
                <VendorCard
                  key={v.id}
                  r={{ vendor: v, offers, minPrice: minPrice(offers), availability: null, bestOffer: null, bestOfferAvailability: null }}
                />
              );
            })}
          </div>
        ) : (
          <Empty>{t("dashboard.noFavorites")}</Empty>
        ))}
      {tab === "following" &&
        (following.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {following.map((v) => (
              <li key={v.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                <Monogram name={v.name} className="size-11 rounded-full" />
                <Link href={`/vendors/${v.slug}`} className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{v.name}</span>
                    {v.verified && <VerifiedSeal />}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{l(v.tagline)}</span>
                </Link>
                <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => toggleFollow(actor, v.id)}>
                  {t("feed.unfollow")}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>{t("feed.emptyFollowing")}</Empty>
        ))}
    </div>
  );
}
