"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Masonry, PostCard } from "@/components/feed/post-card";
import { Empty, PageHeader, Segmented } from "@/components/panel";
import { LinkButton } from "@/components/ui/link-button";
import { VendorCard } from "@/components/vendor/vendor-card";
import { useSaved } from "@/lib/data/views/client";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { routes } from "@/lib/routes";

type Tab = "posts" | "vendors";

/** Everything the client liked: posts from the feed and vendors picked by the assistant */
export default function SavedPage() {
  const { t } = useI18n();
  const actor = useActor();
  const router = useRouter();
  const { posts, vendors } = useSaved(actor);
  const [tab, setTab] = useState<Tab>("posts");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("cabinet.saved")} />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "posts", label: `${t("profile.tabPosts")} · ${posts.length}` },
          { value: "vendors", label: `${t("cabinet.likedVendors")} · ${vendors.length}` },
        ]}
      />
      {tab === "posts" &&
        (posts.length ? (
          <Masonry className="2xl:grid-cols-4">
            {posts.map((it) => (
              <PostCard key={it.post.id} item={it} onOpen={(id) => router.push(routes.post(id))} />
            ))}
          </Masonry>
        ) : (
          <Empty action={<LinkButton href={routes.feed}>{t("nav.feed")}</LinkButton>}>{t("cabinet.noSaved")}</Empty>
        ))}
      {tab === "vendors" &&
        (vendors.length ? (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
            {vendors.map((r) => (
              <VendorCard key={r.vendor.id} r={r} />
            ))}
          </div>
        ) : (
          <Empty action={<LinkButton href={routes.assistant}>{t("nav.chat")}</LinkButton>}>{t("cabinet.noLikedVendors")}</Empty>
        ))}
    </div>
  );
}
