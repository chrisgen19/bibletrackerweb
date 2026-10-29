import { useMemo } from "react";

import { getDayReading } from "@/features/reading-plan/domain/schedule";
import type { DayReading } from "@/features/reading-plan/domain/types";
import { useReadingData } from "@/features/reading-plan/hooks/reading-data-provider";
import { addDaysToDateKey, type DateKey } from "@/utils/date-key";

export interface WeekWindow {
  previous: readonly DayReading[];
  current: readonly DayReading[];
  next: readonly DayReading[];
}

function buildWeek(
  start: DateKey,
  read: (date: DateKey) => DayReading,
): readonly DayReading[] {
  return Array.from({ length: 7 }, (_, offset) =>
    read(addDaysToDateKey(start, offset)),
  );
}

/** The three weeks the week strip keeps mounted, as useMonthWindow does for months. */
export function useWeekWindow(weekStart: DateKey): WeekWindow {
  const { plans, scheduleContext } = useReadingData();

  return useMemo(() => {
    const read = (date: DateKey) => getDayReading(plans, date, scheduleContext);
    return {
      previous: buildWeek(addDaysToDateKey(weekStart, -7), read),
      current: buildWeek(weekStart, read),
      next: buildWeek(addDaysToDateKey(weekStart, 7), read),
    };
  }, [weekStart, plans, scheduleContext]);
}
