"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { unreadCount } from "@/lib/data/queries";
import { useDB } from "@/lib/data/store";
import { useActor, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { NAV_BY_ROLE, isActive } from "./nav-items";

/** Mobile tab bar */
export function BottomNav() {
  const { t } = useI18n();
  const role = useSession((s) => s.role);
  const pathname = usePathname();
  const items = NAV_BY_ROLE[role];
  const actor = useActor();
  const unread = useDB((db) => unreadCount(db, actor));

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 pt-1.5 backdrop-blur-md lg:hidden">
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1 text-[11px] text-muted-foreground transition-colors",
                  active && "text-primary",
                )}
              >
                <span className="relative">
                  <Icon className="size-5" strokeWidth={active ? 2 : 1.6} />
                  {href === "/messages" && unread > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 text-primary-foreground tabular-nums">
                      {unread}
                    </span>
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
