"use client";

import { ImagePlus } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Field, textareaClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { createPost } from "@/lib/data/actions";
import { activeOffers } from "@/lib/data/queries";
import { CATEGORY_PHOTOS, PHOTOS, unsplash } from "@/lib/data/seed/photos";
import { useDB } from "@/lib/data/store";
import type { Post, Vendor } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { readPhoto } from "@/lib/photos";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

const RATIOS = [
  { v: 1.25, label: "4:5" },
  { v: 1, label: "1:1" },
  { v: 1.5, label: "2:3" },
];
const MAX = 6;

/** New feed post: photos (from the device or the portfolio), caption, linked service, format, live preview */
export function PostComposer({ vendor, onDone }: { vendor: Vendor; onDone: (post: Post) => void }) {
  const { t, l, money } = useI18n();
  const actor = useActor();
  const offers = useDB((db) => activeOffers(db, vendor.id));
  const [uploads, setUploads] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [offerId, setOfferId] = useState("");
  const [ratio, setRatio] = useState(1.25);
  const fileRef = useRef<HTMLInputElement>(null);

  // the vendor's own photos first, then stock shots of their category
  const library = Array.from(
    new Set([...uploads, ...vendor.portfolio, ...PHOTOS[CATEGORY_PHOTOS[vendor.category]].map((id) => unsplash(id, 1200))]),
  ).slice(0, 30);
  const offer = offers.find((o) => o.id === offerId);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    try {
      const read = await Promise.all([...files].slice(0, MAX).map((f) => readPhoto(f)));
      setUploads((u) => [...read, ...u]);
      setPicked((p) => [...read, ...p].slice(0, MAX));
    } catch {
      toast.error(t("vsetup.photoError"));
    }
  }

  function publish() {
    const photos = picked.map((src) => {
      const id = src.match(/photo-([\w-]+)\?/)?.[1];
      return id ? unsplash(id, 900, Math.round(900 * ratio)) : src;
    });
    const post = createPost(actor, { vendorId: vendor.id, photos, caption, offerId: offerId || undefined, ratio });
    toast.success(t("vcab.published"));
    onDone(post);
  }

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_240px]">
      <div className="flex flex-col gap-6">
        <div>
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="text-text-secondary">{t("vcab.pickPhotos")}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {picked.length}/{MAX}
            </span>
          </div>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            <li>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-xs text-text-secondary transition-colors hover:border-primary hover:text-primary"
              >
                <ImagePlus className="size-5" strokeWidth={1.5} />
                {t("vsetup.upload")}
              </button>
            </li>
            {library.map((src) => {
              const i = picked.indexOf(src);
              return (
                <li key={src}>
                  <button
                    type="button"
                    onClick={() =>
                      setPicked((p) => (i >= 0 ? p.filter((x) => x !== src) : p.length >= MAX ? p : [...p, src]))
                    }
                    className={cn("relative block aspect-square w-full overflow-hidden rounded-lg bg-muted outline-offset-2", i >= 0 && "outline-2 outline-primary")}
                    aria-pressed={i >= 0}
                  >
                    <Image src={src} alt="" fill sizes="160px" className="object-cover" />
                    {i >= 0 && (
                      <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-2xs text-primary-foreground tabular-nums">
                        {i + 1}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void onFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        <Field label={t("vcab.caption")}>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} maxLength={600} placeholder={t("create.captionPlaceholder")} className={textareaClass} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("vcab.linkOffer")} hint={t("create.linkHint")}>
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
                  className={cn("h-10 flex-1 rounded-lg border text-sm", ratio === r.v ? "border-primary bg-secondary" : "border-border")}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button className="h-11 w-full sm:w-fit sm:px-8" disabled={!picked.length || !caption.trim()} onClick={publish}>
          {t("vcab.publish")}
        </Button>
      </div>

      {/* preview: the post as it shows in the feed */}
      <aside className="max-md:hidden">
        <p className="mb-2 text-sm text-muted-foreground">{t("vsetup.preview")}</p>
        <div className="relative overflow-hidden rounded-2xl bg-neutral-900 text-white" style={{ aspectRatio: `1 / ${ratio}` }}>
          {picked[0] && <Image src={picked[0]} alt="" fill sizes="240px" className="object-cover" />}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="truncate text-xs font-medium">{vendor.name}</p>
            <p className="mt-1 line-clamp-2 text-[11px] text-white/85">{caption || t("create.captionPlaceholder")}</p>
            {offer && <p className="mt-1.5 text-[11px] text-white/70 tabular-nums">{t("feed.fromPrice", { amount: money(offer.price) })}</p>}
          </div>
        </div>
      </aside>
    </div>
  );
}
