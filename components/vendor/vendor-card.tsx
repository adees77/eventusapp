"use client";

import { AskPriceButton } from "@/components/vendor/ask-price";
import { usePricesHidden } from "@/lib/data/views/catalog";
import { Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AvailDots } from "@/components/avail-dots";
import { toggleFavorite } from "@/lib/data/actions";
import type { VendorResult } from "@/lib/data/queries";
import { CITIES } from "@/lib/data/seed/catalog";
import { useIsFavorite } from "@/lib/data/views/vendor";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";
import { Rating, VerifiedSeal } from "./badges";
import { routes } from "@/lib/routes";
import { useAction } from "@/lib/data/use-action";

export function VendorCard({ r, date, priority }: { r: VendorResult; date?: string | null; priority?: boolean }) {
  const { run } = useAction();
  const { t, l, money } = useI18n();
  const actor = useActor();
  const { vendor, minPrice, availability } = r;
  const fav = useIsFavorite(actor.id, vendor.id);
  const cheapest = r.offers.find((o) => o.price === minPrice);
  const hidden = usePricesHidden() && actor.id !== vendor.ownerId;

  return (
    <article className="group relative flex flex-col">
      <Link href={routes.vendor(vendor.slug)} className="flex flex-col gap-3 rounded-2xl outline-offset-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
          {vendor.cover && (
            <Image
              src={vendor.cover}
              alt=""
              fill
              priority={priority}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-opacity duration-200 group-hover:opacity-95"
            />
          )}
        </div>
        <div className="flex flex-col gap-1 px-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-md font-medium text-foreground">{vendor.name}</h3>
            {vendor.verified && <VerifiedSeal />}
          </div>
          <p className="line-clamp-1 text-sm text-text-secondary">{l(vendor.tagline)}</p>
          <div className="mt-1 flex items-center justify-between gap-3 text-sm">
            {hidden ? (
              <AskPriceButton vendorId={vendor.id} />
            ) : (
              <span className="tabular-nums">
                <span className="text-muted-foreground">{t("common.from")} </span>
                <span className="font-medium">{money(minPrice)}</span>
                {cheapest && <span className="text-muted-foreground"> / {l(cheapest.unit)}</span>}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            {date && availability ? (
              <AvailDots a={r.bestOfferAvailability ?? availability} size="sm" />
            ) : (
              <span className="text-xs text-muted-foreground">{l(CITIES[vendor.city])}</span>
            )}
            <Rating value={vendor.rating} count={vendor.reviewsCount} className="text-xs" />
          </div>
        </div>
      </Link>
      {actor.role === "client" && (
        <button
          type="button"
          onClick={() => run(() => toggleFavorite(vendor.id))}
          aria-pressed={fav}
          aria-label={fav ? t("vendor.favorited") : t("vendor.favorite")}
          className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-card/90 text-foreground shadow-soft backdrop-blur transition-colors hover:bg-card active:scale-[0.97]"
        >
          <Heart className={cn("size-4", fav && "fill-primary text-primary")} strokeWidth={1.75} />
        </button>
      )}
    </article>
  );
}

