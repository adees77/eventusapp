"use client";

import { Check, Heart, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Empty, Field, PageHeader, textareaClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { useMyVendor } from "@/components/vendor-panel/use-my-vendor";
import { createPost, deletePost } from "@/lib/data/actions";
import { likeCount } from "@/lib/data/feed";
import { activeOffers } from "@/lib/data/queries";
import { PHOTOS, unsplash } from "@/lib/data/seed/photos";
import { useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

const RATIOS = [
  { v: 1.25, label: "4:5" },
  { v: 1, label: "1:1" },
  { v: 1.5, label: "2:3" },
];

export default function VendorPosts() {
  const { t, l, num, date } = useI18n();
  const actor = useActor();
  const vendor = useMyVendor();
  const db = useDB((d) => d);
  const posts = db.posts.filter((p) => p.vendorId === vendor.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const offers = activeOffers(db, vendor.id);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [offerId, setOfferId] = useState("");
  const [ratio, setRatio] = useState(1.25);

  // library: vendor portfolio + a stock set for the category
  const library = Array.from(
    new Set([
      ...vendor.portfolio,
      ...Object.values(PHOTOS)
        .flat()
        .slice(0, 24)
        .map((id) => unsplash(id, 1200)),
    ]),
  ).slice(0, 30);

  function publish() {
    const photos = picked.map((src) => {
      const id = src.match(/photo-([\w-]+)\?/)?.[1];
      return id ? unsplash(id, 900, Math.round(900 * ratio)) : src;
    });
    createPost(actor, { vendorId: vendor.id, photos, caption, offerId: offerId || undefined, ratio });
    toast.success(t("vcab.published"));
    setOpen(false);
    setPicked([]);
    setCaption("");
    setOfferId("");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("profile.tabPosts")}
        subtitle={t("vcab.postsHint")}
        action={
          <Button className="h-10 px-4" onClick={() => setOpen(true)}>
            <Plus />
            {t("vcab.newPost")}
          </Button>
        }
      />
      {posts.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {posts.map((p) => (
            <li key={p.id} className="group overflow-hidden rounded-2xl bg-card">
              <div className="relative aspect-[4/5] bg-muted">
                <Image src={p.photos[0]} alt="" fill sizes="300px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    deletePost(actor, p.id);
                    toast(t("vcab.postDeleted"));
                  }}
                  className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-card/90 text-muted-foreground opacity-0 shadow-soft transition-opacity group-hover:opacity-100 hover:text-destructive max-lg:opacity-100"
                  aria-label={t("vcab.deletePost")}
                >
                  <Trash2 className="size-4" strokeWidth={1.5} />
                </button>
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-sm">{l(p.caption)}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground tabular-nums">
                  <span>{date(p.createdAt.slice(0, 10), "d MMM")}</span>
                  <span className="inline-flex items-center gap-1">
                    <Heart className="size-3" />
                    {num(likeCount(db, p))}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty action={<Button onClick={() => setOpen(true)}>{t("vcab.newPost")}</Button>}>{t("profile.noPosts")}</Empty>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("vcab.newPost")}</DialogTitle>
          </DialogHeader>
          <div>
            <div className="mb-2 text-sm text-text-secondary">{t("vcab.pickPhotos")}</div>
            <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {library.map((src) => {
                const i = picked.indexOf(src);
                return (
                  <li key={src}>
                    <button
                      type="button"
                      onClick={() => setPicked((p) => (i >= 0 ? p.filter((x) => x !== src) : [...p, src].slice(0, 6)))}
                      className={cn(
                        "relative block aspect-square w-full overflow-hidden rounded-lg bg-muted ring-offset-2",
                        i >= 0 && "ring-2 ring-primary",
                      )}
                      aria-pressed={i >= 0}
                    >
                      <Image src={src} alt="" fill sizes="100px" className="object-cover" />
                      {i >= 0 && (
                        <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-primary text-2xs text-primary-foreground tabular-nums">
                          {i + 1}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <Field label={t("vcab.caption")}>
              <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} maxLength={600} className={textareaClass} />
            </Field>
            <div className="flex flex-col gap-4">
              <Field label={t("vcab.linkOffer")}>
                <NativeSelect value={offerId} onChange={(e) => setOfferId(e.target.value)}>
                  <option value="">—</option>
                  {offers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {l(o.title)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <div>
                <div className="mb-1.5 text-sm text-text-secondary">{t("vcab.format")}</div>
                <div className="flex gap-1.5">
                  {RATIOS.map((r) => (
                    <button
                      key={r.label}
                      type="button"
                      aria-pressed={ratio === r.v}
                      onClick={() => setRatio(r.v)}
                      className={cn(
                        "h-8 flex-1 rounded-lg border text-xs",
                        ratio === r.v ? "border-primary bg-secondary" : "border-border",
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button disabled={!picked.length || !caption.trim()} onClick={publish}>
              <Check />
              {t("vcab.publish")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
