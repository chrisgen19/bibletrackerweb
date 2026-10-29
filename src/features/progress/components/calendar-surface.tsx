import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Panel } from "@/components/panel";
import { cn } from "@/lib/utils";
import type { DateKey } from "@/utils/date-key";

import { describeWeek } from "../domain/reading-journal";
import type { CalendarView } from "../hooks/use-calendar-view";
import type { MonthWindow } from "../hooks/use-month-window";
import { useRecentReadingSummary } from "../hooks/use-reading-journal";
import type { WeekWindow } from "../hooks/use-week-window";
import { WeekdayHeader } from "./calendar-grid";
import { CollapsibleRegion } from "./collapsible-region";
import { MonthNavigator } from "./month-navigator";
import { MonthPager } from "./month-pager";
import { MonthSummary } from "./month-summary";
import { WeekPager } from "./week-pager";

const MONTH_REGION_ID = "calendar-month-region";

interface CalendarSurfaceProps {
  view: CalendarView;
  monthWindow: MonthWindow;
  weekWindow: WeekWindow;
  today: DateKey;
  onSelectDay: (date: DateKey) => void;
}

/**
 * The calendar card. A week strip by default, so the home screen opens on this week
 * rather than a month of mostly past days; the month grid is one tap away and grows out
 * of the same card.
 */
export function CalendarSurface({
  view,
  monthWindow,
  weekWindow,
  today,
  onSelectDay,
}: CalendarSurfaceProps) {
  const showMonth = view.mode === "month";
  const weekLabel = describeWeek(view.weekStart, today);
  const summary = useRecentReadingSummary();

  return (
    <Panel variant="raised">
      <MonthNavigator
        title={showMonth ? monthWindow.current.calendar.title : weekLabel}
        unit={view.mode}
        onPrevious={() => view.step(-1)}
        onNext={() => view.step(1)}
        onReturnToToday={view.returnToToday}
      />

      <CollapsibleRegion open={!showMonth}>
        <div className="pt-3">
          <WeekPager
            window={weekWindow}
            label={weekLabel}
            today={today}
            onSelectDay={onSelectDay}
            onStepWeek={view.step}
          />
        </div>
      </CollapsibleRegion>

      <CollapsibleRegion open={showMonth} id={MONTH_REGION_ID}>
        <div className="pt-4 pb-1">
          <MonthSummary statistics={monthWindow.current.statistics} />
          <div className="mt-4 border-t pt-3">
            <WeekdayHeader />
            <MonthPager
              window={monthWindow}
              today={today}
              onSelectDay={onSelectDay}
              onStepMonth={view.step}
            />
          </div>
        </div>
      </CollapsibleRegion>

      <button
        type="button"
        aria-expanded={showMonth}
        aria-controls={MONTH_REGION_ID}
        onClick={view.toggle}
        className="mx-auto mt-2 -mb-2 flex min-h-11 items-center gap-1 rounded-full px-4 text-footnote font-semibold text-primary outline-none transition-colors hover:bg-primary-soft focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {showMonth ? "Show week" : "Show month"}
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 transition-transform duration-300 motion-reduce:transition-none",
            showMonth && "rotate-180",
          )}
        />
      </button>

      <Link
        href="/history"
        className="-mx-5 mt-4 -mb-5 flex min-h-11 items-center gap-3 rounded-b-2xl border-t px-5 py-3 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset active:bg-pressed"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-body font-medium">
            See your reading history
          </span>
          {summary === null ? null : (
            <span className="mt-0.5 block text-footnote text-muted-foreground">
              {summary}
            </span>
          )}
        </span>
        <ChevronRight className="size-3.5 shrink-0 text-faint" aria-hidden />
      </Link>
    </Panel>
  );
}
