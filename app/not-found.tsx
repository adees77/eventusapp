"use client";

import { LinkButton } from "@/components/ui/link-button";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="flex flex-1 p-2 md:p-3">
      <div className="surface-ink flex flex-1 flex-col items-center justify-center rounded-[28px] px-4 py-24 text-center md:rounded-[36px]">
      <div className="display bg-gradient-to-b from-white/50 to-white/0 bg-clip-text text-[120px] leading-none font-medium text-transparent md:text-[180px]">404</div>
      <h1 className="mt-6 font-heading tracking-[-0.025em] text-4xl font-normal md:text-5xl">{t("notFound.title")}</h1>
      <p className="mt-2 text-sm text-white/60">{t("notFound.text")}</p>
      <LinkButton href="/" variant="sun" className="mt-8 h-11 px-5">
        {t("notFound.home")}
      </LinkButton>
      </div>
    </div>
  );
}
