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
import { NotificationsBell } from "./notifications-bell";
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
    <header className="sticky top-0 z-40 border-b border-border bg-background print:hidden">
      <div className="container-app flex h-14 items-center gap-4 md:h-16">
        <Link href={HOME_BY_ROLE[role]} className="shrink-0" aria-label="EVENTUS">
          <Logo />
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex xl:ml-8">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-8 items-center whitespace-nowrap rounded-lg px-3 text-sm text-text-secondary transition-colors hover:bg-muted hover:text-foreground",
                isActive(pathname, item.href) && "bg-card text-foreground shadow-[inset_0_0_0_1px_var(--border)]",
              )}
            >
              {t(item.label)}
              {item.href === "/messages" && unread > 0 && (
                <span className="ml-2 text-xs text-primary tabular-nums">
                  {unread}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 xl:gap-4">
          <DemoBadge />
          <NotificationsBell />
          <SettingsMenu />
        </div>
      </div>
    </header>
  );
}
