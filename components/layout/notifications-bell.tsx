"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { Bell, BellRing, CheckCheck, Gavel, Heart, Lock, Mail, MessageCircle, Receipt, Star, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { markNotificationsRead } from "@/lib/data/actions";
import { useDB } from "@/lib/data/store";
import type { NotificationKind } from "@/lib/data/types";
import { DATE_LOCALES, useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

const ICON: Record<NotificationKind, typeof Bell> = {
  message: MessageCircle,
  escrow_held: Lock,
  escrow_confirm: Lock,
  escrow_released: Wallet,
  escrow_refunded: Wallet,
  escrow_disputed: Gavel,
  booking_new: Receipt,
  booking_status: Receipt,
  rsvp: Mail,
  review: Star,
  follow: Heart,
  system: BellRing,
};

export function NotificationsBell() {
  const { t, l, locale } = useI18n();
  const actor = useActor();
  const router = useRouter();
  const list = useDB((db) => db.notifications.filter((n) => n.userId === actor.id).slice(0, 12));
  const unread = list.filter((n) => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="relative flex size-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-muted hover:text-foreground"
            aria-label={unread ? t("notif.titleCount", { n: unread }) : t("notif.title")}
          />
        }
      >
        <Bell className="size-[18px]" strokeWidth={1.5} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground tabular-nums ring-2 ring-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(92vw,360px)] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium">{t("notif.title")}</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markNotificationsRead(actor)}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <CheckCheck className="size-3.5" />
              {t("notif.readAll")}
            </button>
          )}
        </div>
        {list.length ? (
          <div className="max-h-[60vh] overflow-y-auto py-1">
            {list.map((n) => {
              const Icon = ICON[n.kind] ?? Bell;
              return (
                <DropdownMenuItem
                  key={n.id}
                  onClick={() => {
                    markNotificationsRead(actor, [n.id]);
                    if (n.href) router.push(n.href);
                  }}
                  className="mx-1 flex items-start gap-3 rounded-lg px-3 py-2.5"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                      n.read ? "bg-muted text-muted-foreground" : "bg-secondary text-primary",
                    )}
                  >
                    <Icon className="size-3.5" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm leading-snug", n.read && "text-text-secondary")}>{l(n.text)}</span>
                    <span className="mt-0.5 block text-2xs text-muted-foreground">
                      {formatDistanceToNowStrict(new Date(n.createdAt), { addSuffix: true, locale: DATE_LOCALES[locale] })}
                    </span>
                  </span>
                  {!n.read && <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />}
                </DropdownMenuItem>
              );
            })}
          </div>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-text-secondary">{t("notif.empty")}</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
