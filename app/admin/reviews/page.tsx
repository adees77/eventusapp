"use client";

import { useState } from "react";
import { PageHeader, Segmented } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Rating } from "@/components/vendor/badges";
import { setReviewHidden } from "@/lib/data/actions";
import { useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

export default function AdminReviews() {
  const { t, l, date } = useI18n();
  const actor = useActor();
  const db = useDB((d) => d);
  const [f, setF] = useState<"low" | "all" | "hidden">("low");
  const low = db.settings.lowRatingThreshold ?? 3;
  const list = db.reviews
    .filter((r) => (f === "low" ? r.rating <= low : f === "hidden" ? r.hidden : true))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 80);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("profile.tabReviews")} />
      <Segmented
        value={f}
        onChange={setF}
        options={[
          { value: "low", label: `${t("acab.lowRated")} · ${db.reviews.filter((r) => r.rating <= low).length}` },
          { value: "all", label: t("common.all") },
          { value: "hidden", label: `${t("admin.hidden")} · ${db.reviews.filter((r) => r.hidden).length}` },
        ]}
      />
      <ul className="divide-y divide-border rounded-2xl bg-card">
        {list.map((r) => (
          <li key={r.id} className={cn("flex flex-col gap-1.5 px-5 py-4 sm:flex-row sm:items-start sm:gap-6", r.hidden && "opacity-60")}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 text-sm">
                <span className="font-medium">{r.author}</span>
                <span className="text-text-secondary">→ {db.vendors.find((v) => v.id === r.vendorId)?.name}</span>
                <span className="text-xs text-muted-foreground">{date(r.date, "d MMM yyyy")}</span>
              </div>
              <Rating value={r.rating} className="mt-1 text-xs" />
              <p className="mt-1 text-sm text-text-secondary">{l(r.text)}</p>
            </div>
            <Button variant="outline" className="h-8 shrink-0 px-3 text-xs" onClick={() => setReviewHidden(actor, r.id, !r.hidden)}>
              {r.hidden ? t("admin.show") : t("admin.hide")}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
