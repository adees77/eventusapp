"use client";

import { LogoMark } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/link-button";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex max-w-sm flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <LogoMark className="h-6 w-auto opacity-40" />
      <h1 className="mt-6 font-serif text-3xl font-medium">{t("notFound.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("notFound.text")}</p>
      <LinkButton href="/" className="mt-6">
        {t("notFound.home")}
      </LinkButton>
    </div>
  );
}
