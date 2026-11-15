"use client";

import { ReviewComposer, ReviewList, ReviewSummary } from "@/components/vendor/reviews";
import type { Review, Vendor } from "@/lib/data/types";

/** Vendor page, «Отзывы»: summary, the composer for clients with a finished deal, the list */
export function ReviewsTab({ vendor, reviews }: { vendor: Vendor; reviews: Review[] }) {
  return (
    <div className="container-app grid max-w-5xl gap-10 py-2 md:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-6 md:sticky md:top-24 md:self-start">
        <ReviewSummary vendor={vendor} reviews={reviews} />
        <div className="rounded-2xl bg-card p-4">
          <ReviewComposer vendor={vendor} />
        </div>
      </aside>
      <ReviewList reviews={reviews} vendor={vendor} />
    </div>
  );
}
