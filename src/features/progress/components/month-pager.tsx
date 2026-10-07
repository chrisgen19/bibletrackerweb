"use client";

import { type KeyboardEvent, useRef } from "react";

import { cn } from "@/lib/utils";
import type { DateKey } from "@/utils/date-key";

import { monthKeyId } from "../domain/calendar-month";
import type { MonthWindow } from "../hooks/use-month-window";
import { useSwipe } from "../hooks/use-swipe";
import { CalendarGrid, getGridHeight } from "./calendar-grid";

interface MonthPagerProps {
  window: MonthWindow;
  today: DateKey;
  onSelectDay: (date: DateKey) => void;
  /** `-1` for the previous month, `+1` for the next. */
  onStepMonth: (step: number) => void;
}

/**
 * Month view with unbounded navigation: swipe, the arrow keys while it has focus, or
 * the navigator's buttons.
 *
 * Only three months are mounted. A swipe slides the neighbour in, then the parent's month
 * advances in the same render that recentres the track, so paging can continue forever
 * in either direction without growing the page list (as bibletrackerapp's pager does).
 */
export function MonthPager({
  window: monthWindow,
  today,
  onSelectDay,
  onStepMonth,
}: MonthPagerProps) {
  const viewport = useRef<HTMLElement>(null);
  const swipe = useSwipe(viewport, onStepMonth);
  const pages = [monthWindow.previous, monthWindow.current, monthWindow.next];

  // Sized to the tallest of the three, so a six-row neighbour is not clipped mid-swipe.
  const height = getGridHeight(
    Math.max(...pages.map((page) => page.calendar.weeks.length)),
  );

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    // Only on the calendar itself: arrow keys inside a day button keep their usual job.
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowLeft") onStepMonth(-1);
    else if (event.key === "ArrowRight") onStepMonth(1);
    else return;
    event.preventDefault();
  }

  return (
    <section
      ref={viewport}
      aria-roledescription="calendar"
      aria-label={`Monthly reading calendar, ${monthWindow.current.calendar.title}. Use the left and right arrow keys to change month.`}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: focusable so the arrow keys can change month
      tabIndex={0}
      onKeyDown={handleKeyDown}
      {...swipe.handlers}
      className="touch-pan-y overflow-hidden rounded-lg outline-none transition-[height] duration-[240ms] focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
      style={{ height }}
    >
      <div
        onTransitionEnd={swipe.onTransitionEnd}
        className={cn(
          "flex w-[300%]",
          swipe.animating &&
            "transition-transform duration-[240ms] ease-out motion-reduce:transition-none",
        )}
        style={{ transform: swipe.transform }}
      >
        {pages.map((page, index) => (
          <div
            key={monthKeyId(page.calendar.key)}
            className="w-1/3"
            // Only the visible month is reachable; the neighbours are there to swipe to.
            inert={index !== 1}
          >
            <CalendarGrid
              month={page.calendar}
              readings={page.readings}
              today={today}
              onSelectDay={onSelectDay}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
