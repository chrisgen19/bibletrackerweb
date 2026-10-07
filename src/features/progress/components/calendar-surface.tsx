import { Panel } from "@/components/panel";
import type { DateKey } from "@/utils/date-key";

import type { MonthWindow } from "../hooks/use-month-window";
import { WeekdayHeader } from "./calendar-grid";
import { MonthNavigator } from "./month-navigator";
import { MonthPager } from "./month-pager";
import { MonthSummary } from "./month-summary";

interface CalendarSurfaceProps {
  window: MonthWindow;
  today: DateKey;
  onSelectDay: (date: DateKey) => void;
  onStepMonth: (step: number) => void;
  /** Provided only while the reader is looking at a month other than the current one. */
  onReturnToToday?: () => void;
}

/** The hero: month navigator, monthly summary and the day grid in one card. */
export function CalendarSurface({
  window: monthWindow,
  today,
  onSelectDay,
  onStepMonth,
  onReturnToToday,
}: CalendarSurfaceProps) {
  const { calendar, statistics } = monthWindow.current;

  return (
    <Panel variant="raised">
      <MonthNavigator
        title={calendar.title}
        onPrevious={() => onStepMonth(-1)}
        onNext={() => onStepMonth(1)}
        onReturnToToday={onReturnToToday}
      />
      <div className="mt-4">
        <MonthSummary statistics={statistics} />
      </div>
      <div className="mt-4 border-t pt-3">
        <WeekdayHeader />
        <MonthPager
          window={monthWindow}
          today={today}
          onSelectDay={onSelectDay}
          onStepMonth={onStepMonth}
        />
      </div>
    </Panel>
  );
}
