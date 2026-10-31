import { memo } from "react";
import type { DayReading } from "@/features/reading-plan/domain/types";
import { useReadingPerspective } from "@/features/reading-plan/hooks/reading-view-context";
import { cn } from "@/lib/utils";

import { ChainBand } from "./chain-band";
import { CHAIN_CIRCLE, type ChainShape } from "./chain-shape";
import { describeDay, getDayAppearance } from "./day-appearance";

/** Each week row is 48px, as on iOS; the pager sizes itself from it. */
export const CALENDAR_ROW_HEIGHT = 48;

export const DAY_TEXT_CLASS = {
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
  /** How a read day joins its neighbours. A lone day is a circle. */
  shape?: ChainShape;
  onSelect: (date: string) => void;
}

function CalendarDayCell({
  day,
  dayOfMonth,
  inCurrentMonth,
  isToday,
  shape = CHAIN_CIRCLE,
  onSelect,
}: CalendarDayProps) {
  const perspective = useReadingPerspective();
  const appearance = getDayAppearance(day.status, { isToday, inCurrentMonth });
  const isCompleted = day.status === "completed";

  return (
    <button
      type="button"
      aria-label={describeDay(day, isToday, perspective)}
      onClick={() => onSelect(day.date)}
      // Raised on focus so the ring is drawn over a neighbouring band.
      className="group relative flex h-12 min-w-0 items-center justify-center rounded-lg outline-none focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <ChainBand
        shape={shape}
        visible={isCompleted}
        opacity={appearance.opacity}
        className="inset-y-1.5"
      />
      <span
        className={cn(
          "relative flex size-9 items-center justify-center rounded-full transition-[background-color,box-shadow]",
          isCompleted
            ? "group-hover:ring-2 group-hover:ring-primary-foreground/40 group-hover:ring-inset"
            : "group-hover:bg-muted",
          appearance.fill === "muted" && "bg-muted",
        )}
        style={{ opacity: appearance.opacity }}
      >
        {appearance.ring ? (
          // On a read day the ring sits inside the band, in the band's own ink.
          <span
            aria-hidden
            className={cn(
              "absolute rounded-full border-2",
              isCompleted
                ? "inset-[3px] border-primary-foreground/80"
                : "inset-0 border-primary",
            )}
          />
        ) : null}
        <span
          className={cn(
            "relative text-calendar-day tabular-nums",
            DAY_TEXT_CLASS[appearance.text],
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
