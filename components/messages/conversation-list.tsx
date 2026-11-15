"use client";

import { format } from "date-fns";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Monogram } from "@/components/vendor/badges";
import { useInbox } from "@/lib/data/views/messaging";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";

export function ConversationList() {
  const { t, date } = useI18n();
  const actor = useActor();
  const pathname = usePathname();
  const convs = useInbox(actor);

  if (!convs.length) {
    return (
      <p className="px-4 py-10 text-center text-sm text-text-secondary">
        {actor.role === "vendor" ? t("messages.emptyVendor") : t("messages.empty")}
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {convs.map(({ conversation: c, name, last, unread }) => {
        const active = pathname === routes.chat(c.id);
        const preview = last ? (last.system ? t(`messages.system.${last.text}` as never) : last.text) : "";
        const today = format(new Date(), "yyyy-MM-dd");
        const lastDay = last ? format(new Date(last.createdAt), "yyyy-MM-dd") : "";
        const when = last ? (lastDay === today ? format(new Date(last.createdAt), "HH:mm") : date(lastDay, "d MMM")) : "";
        return (
          <li key={c.id}>
            <Link
              href={routes.chat(c.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-colors",
                active ? "bg-secondary" : "hover:bg-muted/60",
              )}
            >
              <Monogram name={name} className="size-11 rounded-full text-base" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={cn("truncate text-sm", unread ? "font-medium text-foreground" : "text-foreground")}>{name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{when}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("truncate text-sm", unread ? "text-foreground" : "text-muted-foreground")}>{preview}</span>
                  {unread && <span className="ml-auto size-2 shrink-0 rounded-full bg-primary" aria-label="unread" />}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
