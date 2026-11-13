"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface CabinetItem {
  href: string;
  label: MessageKey;
  icon: LucideIcon;
  /** small count next to the label (unread, pending…) */
  badge?: number;
  /** exact match only (section roots) */
  exact?: boolean;
}

export interface CabinetGroup {
  title?: MessageKey;
  items: CabinetItem[];
}

const isOn = (pathname: string, it: CabinetItem) =>
  it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(`${it.href}/`);

/**
 * Cabinet layout: a quiet left sidebar on desktop, a horizontal tab strip
 * on mobile. Pages render their own PageHeader inside.
 */
export function CabinetShell({
  groups,
  head,
  footer,
  children,
}: {
  groups: CabinetGroup[];
  /** identity block at the top of the sidebar */
  head?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const flat = groups.flatMap((g) => g.items);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col lg:flex-row">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-16 flex h-[calc(100dvh-4rem)] flex-col overflow-y-auto px-4 py-6">
          {head && <div className="mb-6 px-2">{head}</div>}
          <nav className="flex flex-col gap-6">
            {groups.map((g, gi) => (
              <div key={gi}>
                {g.title && <div className="mb-1.5 px-3 text-2xs text-muted-foreground">{t(g.title)}</div>}
                <ul className="flex flex-col gap-0.5">
                  {g.items.map((it) => {
                    const on = isOn(pathname, it);
                    const Icon = it.icon;
                    return (
                      <li key={it.href}>
                        <Link
                          href={it.href}
                          aria-current={on ? "page" : undefined}
                          className={cn(
                            "flex h-10 items-center gap-3 rounded-full px-4 text-sm transition-colors",
                            on
                              ? "bg-ink text-white"
                              : "text-text-secondary hover:bg-foreground/[0.05] hover:text-foreground",
                          )}
                        >
                          <Icon className={cn("size-4 shrink-0", on ? "text-sun" : "text-muted-foreground")} strokeWidth={1.5} />
                          <span className="flex-1 truncate">{t(it.label)}</span>
                          {!!it.badge && <span className={cn("text-xs tabular-nums", on ? "text-sun" : "text-primary")}>{it.badge}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
          {footer && <div className="mt-auto pt-6">{footer}</div>}
        </div>
      </aside>

      <nav
        className="no-scrollbar sticky top-14 z-20 flex gap-1 overflow-x-auto bg-background/90 px-4 py-2 backdrop-blur-md lg:hidden"
        aria-label="cabinet"
      >
        {flat.map((it) => {
          const on = isOn(pathname, it);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm",
                on ? "bg-ink text-white" : "text-muted-foreground",
              )}
            >
              {t(it.label)}
              {!!it.badge && <span className="text-xs text-primary tabular-nums">{it.badge}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="min-w-0 flex-1 px-4 pt-5 pb-16 md:px-8 md:pt-8 xl:px-10">{children}</div>
    </div>
  );
}

/** KPI tile with an optional trend line */
export function Kpi({
  label,
  value,
  note,
  trend,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  trend?: React.ReactNode;
  tone?: "gold" | "primary";
}) {
  return (
    <div className="flex flex-col rounded-3xl bg-card p-4 md:p-6">
      <div className="flex items-center gap-1.5 text-sm text-text-secondary">
        {tone && <span className={cn("size-1.5 rounded-full", tone === "gold" ? "bg-gold" : "bg-primary")} aria-hidden />}
        {label}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="text-xl leading-none font-medium tabular-nums md:text-[28px]">{value}</div>
        {trend}
      </div>
      {note && <div className="mt-2 text-xs text-muted-foreground">{note}</div>}
    </div>
  );
}

/** Role gate for cabinet pages */
export function RoleGate({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  const { t } = useI18n();
  if (!ok)
    return (
      <div className="mx-auto flex flex-1 items-center justify-center px-4 py-24 text-sm text-text-secondary">{t("roles.switchHint")}</div>
    );
  return <>{children}</>;
}
