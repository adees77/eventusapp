"use client";

import { CalendarDays, X } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { MonthCalendar } from "./month-calendar";

export function DatePicker({
  value,
  onChange,
  placeholder,
  className,
  clearable = true,
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
  placeholder?: string;
  className?: string;
  clearable?: boolean;
}) {
  const { t, date } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <span className={cn("relative inline-flex", className)}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-card pr-3 pl-3 text-left text-sm transition-colors hover:bg-muted/50",
                value && clearable && "pr-9",
              )}
            />
          }
        >
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value ? date(value, "d MMMM yyyy") : (placeholder ?? t("catalog.anyDate"))}
          </span>
        </PopoverTrigger>
        {value && clearable && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t("catalog.clearDate")}
          >
            <X className="size-3.5" />
          </button>
        )}
      </span>
      <PopoverContent className="w-[19rem] p-3" align="start">
        <MonthCalendar
          value={value}
          onChange={(iso) => {
            onChange(iso);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
