"use client";

import { Plus, Trash2 } from "lucide-react";
import type { Thread } from "@/lib/ai/chat-store";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function ThreadList({
  threads,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: {
  threads: Thread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const { t, date } = useI18n();
  return (
    <div className="flex h-full flex-col">
      <button
        type="button"
        onClick={onNew}
        className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm text-foreground transition-colors hover:bg-muted"
      >
        <Plus className="size-4 text-muted-foreground" strokeWidth={1.75} />
        {t("chat.newChat")}
      </button>
      <div className="mt-6 mb-2 px-2.5 text-xs text-muted-foreground">{t("chat.history")}</div>
      {threads.length === 0 ? (
        <p className="px-2.5 text-sm text-muted-foreground">{t("chat.emptyHistory")}</p>
      ) : (
        <ul className="flex flex-col gap-0.5 overflow-y-auto">
          {threads.map((th) => (
            <li key={th.id} className="group relative">
              <button
                type="button"
                onClick={() => onSelect(th.id)}
                className={cn(
                  "flex h-9 w-full items-center rounded-lg pr-9 pl-2.5 text-left text-sm transition-colors",
                  th.id === activeId ? "bg-secondary text-secondary-foreground" : "text-text-secondary hover:bg-muted",
                )}
                title={`${th.title} · ${date(th.updatedAt.slice(0, 10), "d MMM")}`}
              >
                <span className="truncate">{th.title}</span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(th.id)}
                aria-label={t("chat.delete")}
                className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-card hover:text-foreground focus-visible:opacity-100"
              >
                <Trash2 className="size-3.5" strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
