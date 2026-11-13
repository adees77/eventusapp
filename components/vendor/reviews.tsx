"use client";

import { BadgeCheck, Flag, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ReportForm } from "@/components/feed/report-form";
import { textareaClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { leaveReview, replyToReview } from "@/lib/data/actions";
import { hadDealWith, ordersDone, reviewableBooking } from "@/lib/data/feed";
import { useDB } from "@/lib/data/store";
import type { Review, Vendor } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

export function useVendorReviews(vendorId: string) {
  return useDB((db) => db.reviews.filter((r) => r.vendorId === vendorId && !r.hidden).sort((a, b) => b.date.localeCompare(a.date)));
}

/** Big rating, review count, completed orders and the 5→1 star distribution */
export function ReviewSummary({ vendor, reviews, className }: { vendor: Vendor; reviews: Review[]; className?: string }) {
  const { t, num, tn } = useI18n();
  const orders = useDB((db) => ordersDone(db, vendor));
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, n: reviews.filter((r) => Math.round(r.rating) === s).length }));
  const max = Math.max(1, ...dist.map((d) => d.n));
  return (
    <div className={cn("flex items-center gap-6", className)}>
      <div className="shrink-0 text-center">
        <div className="text-4xl leading-none font-medium tabular-nums">{vendor.rating ? vendor.rating.toFixed(1) : "—"}</div>
        <Stars value={vendor.rating} className="mt-2 justify-center" />
        <div className="mt-1.5 text-xs text-muted-foreground">{tn("reviews.count", vendor.reviewsCount)}</div>
        <div className="text-xs text-muted-foreground">{t("reviews.orders", { n: num(orders) })}</div>
      </div>
      {reviews.length > 0 && (
        <ul className="flex min-w-0 flex-1 flex-col gap-1">
          {dist.map((d) => (
            <li key={d.s} className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
              <span className="w-2">{d.s}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-gold" style={{ width: `${(d.n / max) * 100}%` }} />
              </span>
              <span className="w-5 text-right">{d.n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Stars({ value, className, size = "size-3.5" }: { value: number; className?: string; size?: string }) {
  return (
    <span className={cn("flex gap-0.5", className)} aria-label={value.toFixed(1)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn(size, n <= Math.round(value) ? "fill-gold text-gold" : "text-border")} strokeWidth={1.5} aria-hidden />
      ))}
    </span>
  );
}

/**
 * Reviews of one vendor. The vendor's owner answers right here (the profile is the one place for
 * reviews); a signed-in client can report a review.
 */
export function ReviewList({ reviews, limit, vendor }: { reviews: Review[]; limit?: number; vendor?: Vendor }) {
  const { t, l, date } = useI18n();
  const actor = useActor();
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState<{ id: string; mode: "reply" | "report" } | null>(null);
  const [draft, setDraft] = useState("");
  const owner = !!vendor && actor.role === "vendor" && vendor.ownerId === actor.id;
  const shown = limit && !all ? reviews.slice(0, limit) : reviews;
  if (!reviews.length) return <p className="py-8 text-center text-sm text-muted-foreground">{t("reviews.empty")}</p>;
  return (
    <>
      <ul className="flex flex-col divide-y divide-border">
        {shown.map((r) => (
          <li key={r.id} className="flex flex-col gap-1.5 py-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{r.author}</span>
              {r.bookingId && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground" title={t("feed.realClientHint")}>
                  <BadgeCheck className="size-3.5 text-gold" strokeWidth={1.75} />
                  {t("feed.realClient")}
                </span>
              )}
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">{date(r.date, "d MMM yyyy")}</span>
              {vendor && actor.role === "client" && r.authorId !== actor.id && (
                <button
                  type="button"
                  onClick={() => setOpen(open?.id === r.id ? null : { id: r.id, mode: "report" })}
                  aria-label={t("mod.report")}
                  title={t("mod.report")}
                  className="-mr-1 flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
                >
                  <Flag className="size-3.5" strokeWidth={1.75} />
                </button>
              )}
            </div>
            <Stars value={r.rating} />
            <p className="text-sm leading-relaxed text-text-secondary">{l(r.text)}</p>
            {r.reply && !(open?.id === r.id && open.mode === "reply") && (
              <div className="mt-1 rounded-2xl bg-foreground/[0.035] px-3.5 py-2.5 text-sm">
                <div className="text-xs text-muted-foreground">{t("profile.vendorReply")}</div>
                <p className="mt-0.5 leading-relaxed text-text-secondary">{r.reply.text}</p>
              </div>
            )}
            {owner && !open && (
              <button
                type="button"
                className="w-fit text-xs text-primary hover:underline"
                onClick={() => {
                  setDraft(r.reply?.text ?? "");
                  setOpen({ id: r.id, mode: "reply" });
                }}
              >
                {r.reply ? t("common.edit") : t("vcab.reply")}
              </button>
            )}
            {open?.id === r.id && open.mode === "reply" && (
              <form
                className="mt-1 flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  replyToReview(actor, r.id, draft);
                  setOpen(null);
                  toast.success(t("common.saved"));
                }}
              >
                <textarea
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  placeholder={t("vcab.replyPlaceholder")}
                  className={textareaClass}
                />
                <div className="flex gap-2">
                  <Button type="submit" className="h-9 px-4" disabled={!draft.trim()}>
                    {t("vcab.reply")}
                  </Button>
                  <Button type="button" variant="ghost" className="h-9 px-4" onClick={() => setOpen(null)}>
                    {t("common.cancel")}
                  </Button>
                </div>
              </form>
            )}
            {open?.id === r.id && open.mode === "report" && (
              <div className="mt-2 rounded-2xl bg-foreground/[0.035] p-3">
                <ReportForm target="review" targetId={r.id} onDone={() => setOpen(null)} />
              </div>
            )}
          </li>
        ))}
      </ul>
      {limit && !all && reviews.length > limit && (
        <button type="button" onClick={() => setAll(true)} className="mt-1 text-sm text-primary hover:text-primary-hover">
          {t("feed.showAllComments", { n: reviews.length })}
        </button>
      )}
    </>
  );
}

/**
 * Rate and review. Open only to clients with a finished deal with this vendor
 * (one review per deal); everyone else sees the rule instead of a form.
 */
export function ReviewComposer({ vendor, compact }: { vendor: Vendor; compact?: boolean }) {
  const { t } = useI18n();
  const actor = useActor();
  const booking = useDB((db) => (actor.role === "client" ? reviewableBooking(db, actor.id, vendor.id) : undefined));
  const reviewed = useDB((db) => actor.role === "client" && hadDealWith(db, actor.id, vendor.id));
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");

  if (!booking)
    return (
      <p className="flex items-start gap-2.5 text-xs leading-relaxed text-text-secondary">
        <BadgeCheck className="mt-px size-4 shrink-0 text-gold" strokeWidth={1.75} />
        {reviewed ? t("reviews.thanks") : t("reviews.rule")}
      </p>
    );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating || !text.trim()) return;
    try {
      leaveReview(actor, booking!.id, rating, text);
      toast.success(t("cabinet.reviewThanks"));
      setText("");
      setRating(0);
    } catch {
      toast.error(t("common.error"));
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm">{t("reviews.yourRating")}</span>
        <span className="flex" role="radiogroup" aria-label={t("cabinet.reviewRating")}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={String(n)} onClick={() => setRating(n)} className="p-0.5">
              <Star className={cn(compact ? "size-6" : "size-7", n <= rating ? "fill-gold text-gold" : "text-border")} strokeWidth={1.25} />
            </button>
          ))}
        </span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={compact ? 2 : 3}
        maxLength={1000}
        placeholder={t("cabinet.reviewPlaceholder")}
        className="w-full resize-none rounded-xl bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
      />
      <button
        type="submit"
        disabled={!rating || !text.trim()}
        className="h-10 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-40"
      >
        {t("reviews.submit")}
      </button>
    </form>
  );
}
