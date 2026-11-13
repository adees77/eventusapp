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
import { vendorOfOwner } from "@/lib/data/queries";
import { CreateMenu } from "./create-menu";
import { HOME_BY_ROLE, NAV_BY_ROLE, isActive } from "./nav-items";
import { SettingsMenu } from "./settings-menu";

export function Header() {
  const { t } = useI18n();
  const role = useSession((s) => s.role);
  const pathname = usePathname();
  const items = NAV_BY_ROLE[role];
  const actor = useActor();
  const unread = useDB((db) => unreadCount(db, actor));
  const mySlug = useDB((db) => (role === "vendor" ? vendorOfOwner(db, actor.id)?.slug : undefined));
  const onMine = !!mySlug && pathname === `/vendors/${mySlug}`;
  const on = (href: string) => (href === "/me" ? onMine : isActive(pathname, href) && !(href === "/vendors" && onMine));

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md print:hidden">
      <div className="container-app flex h-14 items-center gap-4 md:h-16">
        <Link href={HOME_BY_ROLE[role]} className="shrink-0" aria-label="EVENTUS">
          <Logo />
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex xl:ml-8">
          {items.filter((item) => !item.create).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-9 items-center whitespace-nowrap rounded-full px-4 text-sm text-text-secondary transition-colors hover:bg-foreground/[0.05] hover:text-foreground",
                on(item.href) && "bg-ink text-white hover:bg-ink hover:text-white",
              )}
            >
              {t(item.label)}
              {item.href === "/messages" && unread > 0 && (
                <span className={cn("ml-2 text-xs tabular-nums", on(item.href) ? "text-sun" : "text-primary")}>
                  {unread}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 xl:gap-4">
          {items.some((i) => i.create) && <CreateMenu variant="header" />}
          <DemoBadge />
          <NotificationsBell />
          <SettingsMenu />
        </div>
      </div>
    </header>
  );
}
