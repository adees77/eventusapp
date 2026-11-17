"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
import { useI18n } from "@/lib/i18n";
import { useUnreadCount } from "@/lib/data/views/messaging";
import { useOwnVendor } from "@/lib/data/views/vendor";
import { useActor, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { CreateMenu } from "./create-menu";
import { NAV_BY_ROLE, isActive } from "./nav-items";
import { routes } from "@/lib/routes";

/** Mobile tab bar: a floating capsule above the screen edge, iOS style */
export function BottomNav() {
  const { t } = useI18n();
  const role = useSession((s) => s.role);
  const pathname = usePathname();
  const items = NAV_BY_ROLE[role];
  const actor = useActor();
  const unread = useUnreadCount(actor);
  // «Профиль» is the vendor's public page, so it is active there too
  const ownVendor = useOwnVendor();
  const mySlug = role === "vendor" ? ownVendor?.slug : undefined;
  const on = (href: string) => (href === routes.me ? !!mySlug && pathname === routes.vendor(mySlug) : isActive(pathname, href) && !(href === routes.feed && !!mySlug && pathname === routes.vendor(mySlug)));

  return (
    <nav className="bottom-tabbar pointer-events-none fixed inset-x-0 z-40 px-3 lg:hidden print:hidden">
      <ul className="pointer-events-auto mx-auto flex h-[64px] max-w-sm items-center justify-around rounded-full bg-card/90 px-1.5 shadow-[0_10px_32px_rgb(13_26_47/0.16),0_1px_2px_rgb(13_26_47/0.06),inset_0_0_0_0.5px_rgb(255_255_255/0.6)] backdrop-blur-xl backdrop-saturate-150">
        {items.map(({ href, label, icon: Icon, create, orb }) => {
          if (orb) return <OrbTab key={href} href={href} label={t(label)} active={on(href)} />;
          if (create)
            return (
              <li key={href} className="flex flex-1 items-center justify-center">
                <CreateMenu variant="tab" />
              </li>
            );
          const active = on(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                aria-label={t(label)}
                title={t(label)}
                className={cn(
                  "mx-auto flex size-[52px] items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,transform] duration-200 active:scale-95",
                  active && "bg-ink text-white",
                )}
              >
                <span className="relative">
                  <Icon className="size-6" strokeWidth={active ? 1.9 : 1.6} />
                  {href === routes.inbox && unread > 0 && (
                    <span
                      className={cn("absolute -top-0.5 -right-0.5 size-2 rounded-full ring-2", active ? "bg-sun ring-ink" : "bg-primary ring-card")}
                      aria-label={String(unread)}
                    />
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * The assistant as a glowing EVENTUS orb, lifted above the capsule: the bar
 * swells into a round cradle under it, so the orb looks set into the bar.
 */
function OrbTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <li className="relative flex flex-1 justify-center self-stretch">
      {/* the cradle: the bar's top edge swells into a soft round bump under the orb */}
      <svg
        aria-hidden
        viewBox="0 0 120 29"
        className="absolute bottom-[calc(100%-1px)] left-1/2 h-[29px] w-[120px] -translate-x-1/2 text-card drop-shadow-[0_-5px_8px_rgb(13_26_47/0.07)]"
      >
        <path d="M0 29 C18 29 24 26 31 17 C39 6 48 0 60 0 C72 0 81 6 89 17 C96 26 102 29 120 29 Z" fill="currentColor" fillOpacity="0.9" />
      </svg>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        aria-label={label}
        title={label}
        className={cn(
          "absolute -top-5 left-1/2 flex size-[60px] -translate-x-1/2 items-center justify-center rounded-full surface-ink transition-transform duration-200 active:scale-95",
          "shadow-[0_8px_22px_color-mix(in_srgb,var(--primary)_45%,transparent),0_0_0_1px_color-mix(in_srgb,var(--primary)_35%,transparent),inset_0_1px_0_rgb(255_255_255/0.18)]",
          active && "ring-2 ring-sun ring-offset-2 ring-offset-card",
        )}
      >
        <LogoMark title="" className="h-auto w-[38px] text-white" />
      </Link>
    </li>
  );
}
