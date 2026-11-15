"use client";

/** Landing: FAQ */
import { Plus } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Faq() {
  const { t, list } = useI18n();
  const faqs = list("landing.faq");
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="container-app max-w-4xl scroll-mt-6 py-14 md:py-20">
      <h2 className="display text-center text-[32px] md:text-[44px]">{t("landing.faqTitle")}</h2>
      <ul className="mt-10 flex flex-col gap-1.5">
        {Array.from({ length: faqs.length / 2 }, (_, i) => {
          const on = open === i;
          return (
            <li key={i} className={cn("rounded-3xl transition-colors", on ? "bg-card" : "hover:bg-card/60")}>
              <button
                type="button"
                onClick={() => setOpen(on ? null : i)}
                aria-expanded={on}
                className="flex w-full items-center gap-4 px-5 py-5 text-left md:gap-10 md:px-6"
              >
                <span className="w-6 shrink-0 text-sm text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1 text-md font-medium">{faqs[i * 2]}</span>
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full bg-sun text-sun-foreground transition-transform",
                    on && "rotate-45",
                  )}
                  aria-hidden
                >
                  <Plus className="size-4" />
                </span>
              </button>
              {on && (
                <p className="-mt-2 pr-16 pb-5 pl-[60px] text-sm leading-relaxed text-text-secondary md:pl-[88px]">{faqs[i * 2 + 1]}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
