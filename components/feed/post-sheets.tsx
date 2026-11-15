"use client";

/** Bottom sheets over the post viewer (reviews, report) */
import { X } from "lucide-react";
import { ReviewComposer, ReviewList, ReviewSummary } from "@/components/vendor/reviews";
import { useVendorReviews } from "@/lib/data/views/feed";
import type { Vendor } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";

/** A plain sheet over the photo (report form) */
export function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <>
      <button type="button" aria-label={t("feed.close")} onClick={onClose} className="absolute inset-0 z-20 animate-in bg-black/40 fade-in-0" />
      <div
        role="dialog"
        aria-label={title}
        className="absolute inset-x-0 bottom-0 z-20 flex max-h-[85%] animate-in flex-col rounded-t-3xl bg-card text-foreground duration-200 slide-in-from-bottom"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-medium">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("feed.close")}
            autoFocus
            className="-mr-1.5 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(16px,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </>
  );
}

/** Rating and reviews over the photo; rating is open only to clients who used the service */
export function ReviewsSheet({ vendor, onClose }: { vendor: Vendor; onClose: () => void }) {
  const { t } = useI18n();
  const reviews = useVendorReviews(vendor.id);
  return (
    <>
      <button type="button" aria-label={t("feed.close")} onClick={onClose} className="absolute inset-0 z-20 animate-in bg-black/40 fade-in-0" />
      <div
        role="dialog"
        aria-label={t("reviews.title")}
        className="absolute inset-x-0 bottom-0 z-20 flex max-h-[80%] min-h-[55%] animate-in flex-col rounded-t-2xl bg-card text-foreground duration-200 slide-in-from-bottom"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-medium">{t("reviews.title")}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("feed.close")}
            autoFocus
            className="-mr-1.5 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4">
          <ReviewSummary vendor={vendor} reviews={reviews} className="pb-2" />
          <ReviewList reviews={reviews} limit={5} />
        </div>
        <div className="px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <ReviewComposer vendor={vendor} compact />
        </div>
      </div>
    </>
  );
}
