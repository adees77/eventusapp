"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Kpi } from "@/components/layout/cabinet-shell";
import { Empty, PageHeader, textareaClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Rating } from "@/components/vendor/badges";
import { useMyVendor } from "@/components/vendor-panel/use-my-vendor";
import { replyToReview } from "@/lib/data/actions";
import { useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";

export default function VendorReviews() {
  const { t, l, num, date } = useI18n();
  const actor = useActor();
  const vendor = useMyVendor();
  const reviews = useDB((db) => db.reviews.filter((r) => r.vendorId === vendor.id).sort((a, b) => b.date.localeCompare(a.date)));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.rating === n).length }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("profile.tabReviews")} />
      <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
        <Kpi
          label={t("profile.rating")}
          value={vendor.rating ? vendor.rating.toFixed(1) : "—"}
          note={t("vcab.reviewsTotal", { n: num(vendor.reviewsCount) })}
          tone="gold"
        />
        <div className="flex flex-col justify-center gap-1.5 rounded-2xl border border-border bg-card p-5">
          {dist.map(({ n, c }) => (
            <div key={n} className="grid grid-cols-[1.5rem_1fr_2rem] items-center gap-3 text-xs tabular-nums">
              <span className="text-muted-foreground">{n}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-gold"
                  style={{ width: `${reviews.length ? (c / reviews.length) * 100 : 0}%` }}
                />
              </span>
              <span className="text-right text-text-secondary">{c}</span>
            </div>
          ))}
        </div>
      </div>
      {reviews.length ? (
        <ul className="flex flex-col gap-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{r.author}</span>
                <span className="text-xs text-muted-foreground">{date(r.date, "d MMM yyyy")}</span>
              </div>
              <Rating value={r.rating} className="mt-1 text-xs" />
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{l(r.text)}</p>
              {r.reply && editing !== r.id ? (
                <div className="mt-3 border-l-2 border-gold/50 pl-3 text-sm">
                  <div className="text-xs text-muted-foreground">{t("profile.vendorReply")}</div>
                  <p className="mt-0.5 text-text-secondary">{r.reply.text}</p>
                  <button
                    type="button"
                    className="mt-1 text-xs text-primary hover:underline"
                    onClick={() => {
                      setDrafts((d) => ({ ...d, [r.id]: r.reply!.text }));
                      setEditing(r.id);
                    }}
                  >
                    {t("common.edit")}
                  </button>
                </div>
              ) : editing === r.id || !r.reply ? (
                <form
                  className="mt-3 flex flex-col gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    replyToReview(actor, r.id, drafts[r.id] ?? "");
                    setEditing(null);
                    toast.success(t("common.saved"));
                  }}
                >
                  <textarea
                    value={drafts[r.id] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                    rows={2}
                    placeholder={t("vcab.replyPlaceholder")}
                    className={textareaClass}
                  />
                  <div>
                    <Button type="submit" variant="outline" className="h-9 px-4" disabled={!(drafts[r.id] ?? "").trim()}>
                      {t("vcab.reply")}
                    </Button>
                  </div>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <Empty>{t("profile.noPosts")}</Empty>
      )}
    </div>
  );
}
