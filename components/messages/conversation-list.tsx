"use client";

import { format } from "date-fns";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Monogram } from "@/components/vendor/badges";
import { conversationsFor, isUnread, lastMessage, userName, vendorById } from "@/lib/data/queries";
import { useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

export function useCounterpart() {
  const actor = useActor();
  const db = useDB((d) => d);
  return (c: { clientId: string; vendorId: string }) =>
    actor.role === "vendor" ? userName(db, c.clientId) : (vendorById(db, c.vendorId)?.name ?? "");
}

export function ConversationList() {
  const { t, date } = useI18n();
  const actor = useActor();
  const pathname = usePathname();
  const db = useDB((d) => d);
  const convs = conversationsFor(db, actor);
  const nameOf = useCounterpart();

  if (!convs.length) {
    return (
      <p className="px-4 py-10 text-center text-sm text-text-secondary">
        {actor.role === "vendor" ? t("messages.emptyVendor") : t("messages.empty")}
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {convs.map((c) => {
        const last = lastMessage(db, c.id);
        const unread = isUnread(db, c, actor.id);
        const name = nameOf(c);
        const active = pathname === `/messages/${c.id}`;
        const preview = last ? (last.system ? t(`messages.system.${last.text}` as never) : last.text) : "";
        const today = format(new Date(), "yyyy-MM-dd");
        const lastDay = last ? format(new Date(last.createdAt), "yyyy-MM-dd") : "";
        const when = last ? (lastDay === today ? format(new Date(last.createdAt), "HH:mm") : date(lastDay, "d MMM")) : "";
        return (
          <li key={c.id}>
            <Link
              href={`/messages/${c.id}`}
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
