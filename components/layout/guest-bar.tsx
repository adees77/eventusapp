"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/link-button";
import { brand } from "@/config/brand";
import { useI18n } from "@/lib/i18n";
import { routes } from "@/lib/routes";

/** Top bar for guests browsing the feed without an account: the logo, sign in and sign up */
export function GuestBar() {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md">
      <div className="container-app flex h-16 items-center gap-3">
        <Link href={routes.home} aria-label={brand.name} className="shrink-0">
          <Logo />
        </Link>
        <div className="ml-auto flex items-center gap-1.5">
          <Link href={routes.welcome} className="hidden h-9 items-center px-3 text-sm text-text-secondary transition-colors hover:text-foreground sm:flex">
            {t("landing.signIn")}
          </Link>
          <LinkButton href={routes.welcome} variant="sun" className="h-9 px-4">
            {t("demo.signUp")}
          </LinkButton>
        </div>
      </div>
    </header>
  );
}
