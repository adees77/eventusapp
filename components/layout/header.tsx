"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { useI18n } from "@/lib/i18n";
import { unreadCount } from "@/lib/data/queries";
import { useDB } from "@/lib/data/store";
import { useActor, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { DemoBadge } from "./demo-badge";
import { HOME_BY_ROLE, NAV_BY_ROLE, isActive } from "./nav-items";
import { SettingsMenu } from "./settings-menu";

export function Header() {
  const { t } = useI18n();
  const role = useSession((s) => s.role);
  const pathname = usePathname();
  const items = NAV_BY_ROLE[role];
  const actor = useActor();
  const unread = useDB((db) => unreadCount(db, actor));

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 md:h-16 md:px-6">
        <Link href={HOME_BY_ROLE[role]} className="shrink-0" aria-label="EVENTUS">
          <Logo />
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                isActive(pathname, item.href) && "bg-secondary text-secondary-foreground",
              )}
            >
              {t(item.label)}
              {item.href === "/messages" && unread > 0 && (
                <span className="ml-1.5 inline-flex min-w-4 justify-center rounded-full bg-primary px-1 text-[11px] leading-4 text-primary-foreground tabular-nums">
                  {unread}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <DemoBadge />
          <SettingsMenu />
        </div>
      </div>
    </header>
  );
}
