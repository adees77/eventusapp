"use client";

import { LayoutGrid, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/link-button";
import { brand } from "@/config/brand";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";

/** What a guest can open without an account: the feed, the invitations example, «Profile» (asks to sign up) */
const GUEST_TABS = [
  { href: routes.feed, label: "nav.feed", icon: LayoutGrid },
  { href: routes.invitations, label: "nav.invitations", icon: Mail },
  { href: routes.me, label: "nav.profile", icon: UserRound },
] as const;

const isOn = (pathname: string, href: string) => pathname === href || (href === routes.feed && pathname.startsWith(`${routes.feed}/`));

/** Top bar for guests: the logo (back to the landing), the three guest tabs on desktop, sign in and sign up */
export function GuestBar() {
  const { t } = useI18n();
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md">
      <div className="container-app flex h-16 items-center gap-3">
        <Link href={routes.home} aria-label={brand.name} className="shrink-0">
          <Logo />
        </Link>
        <nav className="ml-6 hidden items-center gap-1 text-sm lg:flex">
          {GUEST_TABS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={isOn(pathname, href) ? "page" : undefined}
              className={cn("rounded-full px-4 py-2 transition-colors", isOn(pathname, href) ? "bg-ink text-white" : "text-text-secondary hover:text-foreground")}
            >
              {t(label)}
            </Link>
          ))}
        </nav>
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

/** The floating bottom capsule for guests on phones (same look as the app's own) */
export function GuestTabbar() {
  const { t } = useI18n();
  const pathname = usePathname();
  return (
    <nav className="bottom-tabbar pointer-events-none fixed inset-x-0 z-40 px-3 lg:hidden">
      <ul className="pointer-events-auto mx-auto flex h-[64px] max-w-[260px] items-center justify-around rounded-full bg-card/90 px-1.5 shadow-[0_10px_32px_rgb(13_26_47/0.16),0_1px_2px_rgb(13_26_47/0.06)] backdrop-blur-xl">
        {GUEST_TABS.map(({ href, label, icon: Icon }) => {
          const active = isOn(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                aria-label={t(label)}
                className={cn(
                  "mx-auto flex size-[52px] items-center justify-center rounded-full text-muted-foreground transition-colors active:scale-95",
                  active && "bg-ink text-white",
                )}
              >
                <Icon className="size-6" strokeWidth={active ? 1.9 : 1.6} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
