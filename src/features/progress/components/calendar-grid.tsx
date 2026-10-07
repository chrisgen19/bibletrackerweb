import type { DayReading } from "@/features/reading-plan/domain/types";
import type { DateKey } from "@/utils/date-key";

import {
  type CalendarMonth,
  WEEKDAY_ACCESSIBILITY_LABELS,
  WEEKDAY_LABELS,
} from "../domain/calendar-month";
import { CALENDAR_ROW_HEIGHT, CalendarDay } from "./calendar-day";

interface CalendarGridProps {
  month: CalendarMonth;
  readings: ReadonlyMap<DateKey, DayReading>;
  today: DateKey;
  onSelectDay: (date: DateKey) => void;
}

/** Day initials above the grid. Hidden from screen readers: each day names itself. */
export function WeekdayHeader() {
  return (
    <div aria-hidden className="mb-1 grid grid-cols-7">
      {WEEKDAY_LABELS.map((label, index) => (
        <span
          key={WEEKDAY_ACCESSIBILITY_LABELS[index]}
          className="flex h-5 items-center justify-center text-weekday text-faint"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

/** A single month's day grid. The pager renders three of these side by side. */
export function CalendarGrid({
  month,
  readings,
  today,
  onSelectDay,
}: CalendarGridProps) {
  return (
    <div>
      {month.weeks.map((week) => {
        const weekKey = week[0]?.date ?? String(month.key.month);
        return (
          <div key={weekKey} className="grid grid-cols-7">
            {week.map((cell) => {
              const day = readings.get(cell.date);
              if (day === undefined) {
                return <span key={cell.date} className="h-12" />;
              }
              return (
                <CalendarDay
                  key={cell.date}
                  day={day}
                  dayOfMonth={cell.dayOfMonth}
                  inCurrentMonth={cell.inCurrentMonth}
                  isToday={cell.date === today}
                  onSelect={onSelectDay}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function getGridHeight(rowCount: number): number {
  return rowCount * CALENDAR_ROW_HEIGHT;
}
