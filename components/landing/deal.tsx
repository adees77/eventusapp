"use client";

/** Landing: how the safe deal works */
import { ArrowRight, Check, Lock } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { useI18n } from "@/lib/i18n";
import { routes } from "@/lib/routes";

export function Deal() {
  const { t, money } = useI18n();
  return (
    <section id="deal" className="container-app scroll-mt-6 py-6 md:py-10">
      <div className="grid grid-cols-1 items-center gap-10 rounded-[36px] bg-cream p-6 md:p-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 className="display text-[32px] md:text-[44px]">{t("landing.dealTitle")}</h2>
          <p className="mt-5 max-w-lg text-md leading-relaxed text-text-secondary">{t("landing.dealText")}</p>
          <LinkButton href={routes.welcome} variant="sun" className="mt-8 h-11 px-5">
            {t("landing.dealCta")}
            <ArrowRight />
          </LinkButton>
        </div>

        <div className="surface-ink relative overflow-hidden rounded-[32px] p-5 md:p-8">
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-3xl bg-white/10 shadow-[0_0_60px_rgb(42_95_165/0.6)] md:size-24">
            <Lock className="size-9 text-sun" strokeWidth={1.25} />
          </div>
          <div className="rounded-3xl bg-white p-5 text-foreground">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">{t("escrow.title")}</span>
              <span className="text-md font-medium tabular-nums">{money(45000)}</span>
            </div>
            <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-text-secondary">
              <span className="size-1.5 rounded-full bg-primary" />
              {t("escrow.states.held")}
            </span>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-success/10 px-3 py-2.5">
                <div className="text-2xs text-muted-foreground">{t("escrow.client")}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-sm text-success">
                  <Check className="size-3.5" strokeWidth={2.5} />
                  {t("escrow.confirmed")}
                </div>
              </div>
              <div className="rounded-2xl bg-cream px-3 py-2.5">
                <div className="text-2xs text-muted-foreground">{t("escrow.vendor")}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-sm text-text-secondary">
                  <span className="size-1.5 rounded-full bg-sun" />
                  {t("escrow.waiting")}
                </div>
              </div>
            </div>
            <div className="mt-4 flex h-11 items-center justify-center gap-2 rounded-full bg-primary text-sm text-primary-foreground">
              <Check className="size-4" />
              {t("escrow.confirm")}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
