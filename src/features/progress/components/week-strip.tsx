import { format } from "date-fns";
import { memo, useMemo } from "react";

import type { DayReading } from "@/features/reading-plan/domain/types";
import { cn } from "@/lib/utils";
import { type DateKey, fromDateKey } from "@/utils/date-key";

import { DAY_TEXT_CLASS } from "./calendar-day";
import { ChainBand } from "./chain-band";
import {
  CHAIN_CIRCLE,
  type ChainShape,
  getWeekChainShapes,
} from "./chain-shape";
import { describeDay, getDayAppearance } from "./day-appearance";

interface WeekDayPillProps {
  day: DayReading;
  isToday: boolean;
  /** How a read day joins its neighbours. A lone day is a pill of its own. */
  shape?: ChainShape;
  onSelect: (date: DateKey) => void;
}

function WeekDayPillCell({
  day,
  isToday,
  shape = CHAIN_CIRCLE,
  onSelect,
}: WeekDayPillProps) {
  const appearance = getDayAppearance(day.status, {
    isToday,
    inCurrentMonth: true,
  });
  const isCompleted = day.status === "completed";
  const date = fromDateKey(day.date);
  // Days still to come, and days outside the plan, keep the pill's outline so the strip
  // holds its shape; a missed day is a soft fill, never a warning.
  const outlined =
    !isCompleted && appearance.fill === "none" && !appearance.ring;

  return (
    <button
      type="button"
      aria-label={describeDay(day, isToday)}
      aria-current={isToday ? "date" : undefined}
      onClick={() => onSelect(day.date)}
      // Raised on focus so the ring is drawn over a neighbouring band.
      className="group relative flex h-[76px] min-w-0 justify-center outline-none focus-visible:z-10"
    >
      <ChainBand
        shape={shape}
        visible={isCompleted}
        opacity={appearance.opacity}
        className="inset-y-0"
      />
      <span
        className={cn(
          "relative flex h-full w-9 flex-col items-center justify-center gap-1.5 rounded-full transition-[background-color,box-shadow] group-focus-visible:ring-3 group-focus-visible:ring-ring/50",
          isCompleted
            ? "group-hover:ring-2 group-hover:ring-primary-foreground/40 group-hover:ring-inset"
            : "group-hover:bg-muted",
          !isCompleted &&
            (appearance.fill === "muted" ? "bg-muted" : "bg-card"),
          outlined && "border",
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
          aria-hidden
          className={cn(
            "relative text-weekday",
            isCompleted ? "text-primary-foreground/80" : "text-faint",
            isToday && !isCompleted && "text-primary",
          )}
        >
          {format(date, "EEEEE")}
        </span>
        <span
          aria-hidden
          className={cn(
            "relative text-calendar-day tabular-nums",
            DAY_TEXT_CLASS[appearance.text],
            appearance.weight === "semibold" && "font-semibold",
          )}
        >
          {date.getDate()}
        </span>
      </span>
    </button>
  );
}

const WeekDayPill = memo(WeekDayPillCell);

interface WeekStripProps {
  days: readonly DayReading[];
  today: DateKey;
  onSelectDay: (date: DateKey) => void;
  /** The Saturday before was read: a run carrying on trails in from the left edge. */
  readBefore?: boolean;
  /** The Sunday after was read: the run trails off the right edge. */
  readAfter?: boolean;
}

/**
 * One week as seven tall pills. Consecutive read days join into one band, the same chain
 * the month grid draws.
 */
export function WeekStrip({
  days,
  today,
  onSelectDay,
  readBefore = false,
  readAfter = false,
}: WeekStripProps) {
  const shapes = useMemo(
    () => getWeekChainShapes(days, { readBefore, readAfter }),
    [days, readBefore, readAfter],
  );

  return (
    <div className="grid grid-cols-7">
      {days.map((day, index) => (
        <WeekDayPill
          key={day.date}
          day={day}
          isToday={day.date === today}
          shape={shapes[index]}
          onSelect={onSelectDay}
        />
      ))}
    </div>
  );
}
