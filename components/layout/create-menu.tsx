"use client";

import { CalendarX2, ChevronRight, Images, ListChecks, Plus, Tag, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const ACTIONS: { href: string; icon: LucideIcon; title: MessageKey; hint: MessageKey }[] = [
  { href: "/create/post", icon: Images, title: "create.post", hint: "create.postHint" },
  { href: "/create/service", icon: Tag, title: "create.service", hint: "create.serviceHint" },
  { href: "/vendor/details", icon: ListChecks, title: "create.details", hint: "create.detailsHint" },
  { href: "/vendor#calendar", icon: CalendarX2, title: "create.calendar", hint: "create.calendarHint" },
];

/**
 * The vendor's author button («+» like in TikTok / Instagram): everything they
 * put out — posts, services, details — starts here.
 */
export function CreateMenu({ variant }: { variant: "tab" | "header" }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === "tab" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("create.title")}
          className="mx-auto flex h-9 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft transition-transform active:scale-95"
        >
          <Plus className="size-5" strokeWidth={2} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="hidden h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm text-primary-foreground transition-colors hover:bg-primary-hover lg:flex"
        >
          <Plus className="size-4" strokeWidth={2} />
          {t("create.title")}
        </button>
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="mx-auto w-full max-w-lg rounded-t-2xl px-2 pt-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <SheetTitle className="px-4 font-heading tracking-[-0.025em] text-2xl font-normal">{t("create.title")}</SheetTitle>
          <ul className="flex flex-col">
            {ACTIONS.map((a) => (
              <li key={a.href}>
                <Link
                  href={a.href}
                  onClick={() => setOpen(false)}
                  className={cn("flex items-center gap-4 rounded-xl px-4 py-3 transition-colors hover:bg-muted")}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                    <a.icon className="size-5" strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-md">{t(a.title)}</span>
                    <span className="block text-xs text-muted-foreground">{t(a.hint)}</span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
