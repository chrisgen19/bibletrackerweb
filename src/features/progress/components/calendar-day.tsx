import { memo } from "react";

import type { DayReading } from "@/features/reading-plan/domain/types";
import { cn } from "@/lib/utils";

import { describeDay, getDayAppearance } from "./day-appearance";

/** Each week row is 48px, as on iOS; the pager sizes itself from it. */
export const CALENDAR_ROW_HEIGHT = 48;

const TEXT_CLASS = {
  primary: "text-primary",
  "on-primary": "text-primary-foreground",
  secondary: "text-muted-foreground",
  tertiary: "text-faint",
} as const;

interface CalendarDayProps {
  day: DayReading;
  dayOfMonth: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  onSelect: (date: string) => void;
}

function CalendarDayCell({
  day,
  dayOfMonth,
  inCurrentMonth,
  isToday,
  onSelect,
}: CalendarDayProps) {
  const appearance = getDayAppearance(day.status, { isToday, inCurrentMonth });
  const isCompleted = day.status === "completed";

  return (
    <button
      type="button"
      aria-label={describeDay(day, isToday)}
      onClick={() => onSelect(day.date)}
      className="group flex h-12 flex-1 items-center justify-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span
        className={cn(
          "relative flex size-9 items-center justify-center rounded-full transition-colors group-hover:bg-muted",
          appearance.fill === "muted" && "bg-muted",
        )}
        style={{ opacity: appearance.opacity }}
      >
        {/* Always mounted, so a freshly marked day blooms rather than snapping. */}
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 rounded-full bg-primary transition-[transform,opacity] duration-[240ms] ease-out motion-reduce:transition-none",
            isCompleted ? "scale-100 opacity-100" : "scale-[0.72] opacity-0",
          )}
        />
        {appearance.ring ? (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full border-2 border-primary"
          />
        ) : null}
        <span
          className={cn(
            "relative text-calendar-day",
            TEXT_CLASS[appearance.text],
            appearance.weight === "semibold" && "font-semibold",
          )}
        >
          {dayOfMonth}
        </span>
      </span>
    </button>
  );
}

export const CalendarDay = memo(CalendarDayCell);
