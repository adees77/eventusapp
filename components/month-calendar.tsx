"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { DATE_LOCALES, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface DayInfo {
  iso: string;
  date: Date;
  inMonth: boolean;
  past: boolean;
  selected: boolean;
}

/**
 * Month grid with Monday-first weeks. `renderDay` draws the cell content,
 * so the same grid serves the date picker and the availability calendar.
 */
export function MonthCalendar({
  value,
  onChange,
  renderDay,
  initialMonth,
  allowPast = false,
  className,
  cellClassName,
}: {
  value?: string | null;
  onChange?: (iso: string) => void;
  renderDay?: (d: DayInfo) => React.ReactNode;
  initialMonth?: string | null;
  allowPast?: boolean;
  className?: string;
  cellClassName?: (d: DayInfo) => string | undefined;
}) {
  const { locale } = useI18n();
  const dl = DATE_LOCALES[locale];
  const today = startOfDay(new Date());
  const [month, setMonth] = useState(() => startOfMonth(initialMonth ? parseISO(initialMonth) : value ? parseISO(value) : today));

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const weekdays = days.slice(0, 7).map((d) => format(d, "EEEEEE", { locale: dl }));
  const canPrev = allowPast || !isSameMonth(month, today);

  return (
    <div className={cn("select-none", className)}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, -1))}
          disabled={!canPrev}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="text-sm font-medium capitalize">{format(month, "LLLL yyyy", { locale: dl })}</div>
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map((w) => (
          <div key={w} className="pb-1 text-xs text-muted-foreground capitalize">
            {w}
          </div>
        ))}
        {days.map((date) => {
          const iso = format(date, "yyyy-MM-dd");
          const info: DayInfo = {
            iso,
            date,
            inMonth: isSameMonth(date, month),
            past: isBefore(date, today),
            selected: value === iso,
          };
          const disabled = !info.inMonth || (!allowPast && info.past);
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onChange?.(iso)}
              aria-pressed={info.selected}
              aria-label={format(date, "d MMMM yyyy", { locale: dl })}
              className={cn(
                "flex min-h-10 flex-col items-center justify-center rounded-lg text-sm tabular-nums transition-colors",
                !info.inMonth && "invisible",
                disabled ? "text-muted-foreground/50" : "hover:bg-muted",
                info.selected && "bg-primary text-primary-foreground hover:bg-primary",
                cellClassName?.(info),
              )}
            >
              {renderDay ? renderDay(info) : format(date, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
