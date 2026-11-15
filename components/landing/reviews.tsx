"use client";

/** Landing: review carousel */
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import { useState } from "react";
import { Monogram } from "@/components/vendor/badges";
import { useQuotableReviews } from "@/lib/data/views/landing";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Reviews() {
  const { t, l, locale } = useI18n();
  const reviews = useQuotableReviews(locale);
  const [i, setI] = useState(0);
  if (reviews.length < 3) return null;
  const at = (k: number) => reviews[(i + k + reviews.length) % reviews.length];

  return (
    <section className="overflow-hidden py-14 md:py-24">
      <div className="container-app text-center">
        <h2 className="display mx-auto max-w-2xl text-[32px] md:text-[44px]">{t("landing.reviewsTitle")}</h2>
        <p className="mt-3 text-sm text-text-secondary">{t("landing.reviewsNote")}</p>
      </div>
      <div className="container-app mt-12 grid grid-cols-1 items-center gap-4 md:grid-cols-3 md:gap-0">
        {[-1, 0, 1].map((k) => {
          const { review: r, vendorName } = at(k);
          const center = k === 0;
          return (
            <figure
              key={`${r.id}-${k}`}
              className={cn(
                "animate-rise rounded-[28px] p-6 text-center md:p-8",
                center
                  ? "z-10 bg-sun text-sun-foreground md:scale-105"
                  : cn("hidden bg-card shadow-lift md:block", k < 0 ? "md:translate-x-4 md:-rotate-6" : "md:-translate-x-4 md:rotate-6"),
              )}
            >
              <Monogram name={r.author} className={cn("mx-auto size-12", center && "bg-white/60")} />
              <figcaption className="mt-3">
                <div className="font-medium">{r.author}</div>
                <div className={cn("text-xs", center ? "text-sun-foreground/70" : "text-muted-foreground")}>{vendorName}</div>
              </figcaption>
              <div className="mt-3 flex justify-center gap-0.5">
                {Array.from({ length: 5 }, (_, s) => (
                  <Star key={s} className={cn("size-4", center ? "fill-sun-foreground text-sun-foreground" : "fill-sun text-sun")} />
                ))}
              </div>
              <blockquote className="mt-4 text-sm leading-relaxed">«{l(r.text)}»</blockquote>
            </figure>
          );
        })}
      </div>
      <div className="mt-10 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setI(i - 1)}
          aria-label={t("landing.prev")}
          className="flex size-10 items-center justify-center rounded-full bg-card shadow-soft hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setI(i + 1)}
          aria-label={t("landing.next")}
          className="flex size-10 items-center justify-center rounded-full bg-sun text-sun-foreground hover:brightness-95"
        >
          <ArrowRight className="size-4" />
        </button>
      </div>
    </section>
  );
}
