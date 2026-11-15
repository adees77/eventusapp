"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useUnreadCount } from "@/lib/data/views/messaging";
import { useOwnVendor } from "@/lib/data/views/vendor";
import { useActor, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { CreateMenu } from "./create-menu";
import { NAV_BY_ROLE, isActive } from "./nav-items";
import { routes } from "@/lib/routes";

/** Mobile tab bar */
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
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 bg-background/90 backdrop-blur-md shadow-[0_-8px_24px_rgb(13_26_47/0.06)] pt-2 lg:hidden print:hidden">
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map(({ href, label, icon: Icon, create }) => {
          if (create)
            return (
              <li key={href} className="flex flex-1 items-center">
                <CreateMenu variant="tab" />
              </li>
            );
          const active = on(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-1 text-2xs text-muted-foreground transition-colors",
                  active && "text-primary",
                )}
              >
                <span className="relative">
                  <Icon className="size-5" strokeWidth={1.5} />
                  {href === routes.inbox && unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary ring-2 ring-background" aria-label={String(unread)} />
                  )}
                </span>
                {t(label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
