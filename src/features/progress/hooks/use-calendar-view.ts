import { useState } from "react";

import {
  addDaysToDateKey,
  compareDateKeys,
  type DateKey,
  toDateKey,
} from "@/utils/date-key";

import {
  addMonthsToMonthKey,
  type MonthKey,
  monthKeyFromDateKey,
  monthKeysEqual,
  monthKeyToDate,
} from "../domain/calendar-month";
import { startOfWeekKey } from "../domain/reading-journal";

export type CalendarMode = "week" | "month";

export interface CalendarView {
  mode: CalendarMode;
  /** The Sunday of the week the strip shows. */
  weekStart: DateKey;
  monthKey: MonthKey;
  /** Steps a week in the strip, a month in the grid. */
  step: (step: number) => void;
  toggle: () => void;
  /** Provided only while the reader is looking away from today's week or month. */
  returnToToday?: () => void;
}

/**
 * Which week or month the calendar shows. The strip is the default; expanding opens the
 * month holding the week in view, and collapsing returns to today's week when that month
 * is the current one, else to the month's first week. Nothing survives a reload.
 */
export function useCalendarView(today: DateKey): CalendarView {
  const [mode, setMode] = useState<CalendarMode>("week");
  const [weekStart, setWeekStart] = useState(() => startOfWeekKey(today));
  const [monthKey, setMonthKey] = useState(() => monthKeyFromDateKey(today));

  const currentWeek = startOfWeekKey(today);
  const currentMonth = monthKeyFromDateKey(today);
  const atToday =
    mode === "week"
      ? weekStart === currentWeek
      : monthKeysEqual(monthKey, currentMonth);

  function toggle() {
    if (mode === "week") {
      const holdsToday =
        compareDateKeys(today, weekStart) >= 0 &&
        compareDateKeys(today, addDaysToDateKey(weekStart, 6)) <= 0;
      // A week that straddles two months opens on the one holding its Wednesday.
      setMonthKey(
        monthKeyFromDateKey(
          holdsToday ? today : addDaysToDateKey(weekStart, 3),
        ),
      );
      setMode("month");
      return;
    }
    setWeekStart(
      monthKeysEqual(monthKey, currentMonth)
        ? currentWeek
        : startOfWeekKey(toDateKey(monthKeyToDate(monthKey))),
    );
    setMode("week");
  }

  function step(amount: number) {
    if (mode === "week")
      setWeekStart((start) => addDaysToDateKey(start, 7 * amount));
    else setMonthKey((key) => addMonthsToMonthKey(key, amount));
  }

  return {
    mode,
    weekStart,
    monthKey,
    step,
    toggle,
    returnToToday: atToday
      ? undefined
      : () => {
          setWeekStart(currentWeek);
          setMonthKey(currentMonth);
        },
  };
}
