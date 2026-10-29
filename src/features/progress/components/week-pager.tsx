"use client";

import { type KeyboardEvent, useRef } from "react";

import { cn } from "@/lib/utils";
import type { DateKey } from "@/utils/date-key";

import { useSwipe } from "../hooks/use-swipe";
import type { WeekWindow } from "../hooks/use-week-window";
import { WeekStrip } from "./week-strip";

interface WeekPagerProps {
  window: WeekWindow;
  /** "This week", "Week of 12 Oct": names the region for screen readers. */
  label: string;
  today: DateKey;
  onSelectDay: (date: DateKey) => void;
  /** `-1` for the previous week, `+1` for the next. */
  onStepWeek: (step: number) => void;
}

/**
 * The week strip with unbounded navigation: swipe, the arrow keys while it has focus, or
 * the navigator's buttons. Three weeks are mounted, as MonthPager mounts three months.
 */
export function WeekPager({
  window: weekWindow,
  label,
  today,
  onSelectDay,
  onStepWeek,
}: WeekPagerProps) {
  const viewport = useRef<HTMLElement>(null);
  const swipe = useSwipe(viewport, onStepWeek);
  const pages = [weekWindow.previous, weekWindow.current, weekWindow.next];

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    // Only on the strip itself: arrow keys inside a day button keep their usual job.
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowLeft") onStepWeek(-1);
    else if (event.key === "ArrowRight") onStepWeek(1);
    else return;
    event.preventDefault();
  }

  return (
    <section
      ref={viewport}
      aria-roledescription="calendar"
      aria-label={`Weekly reading calendar, ${label}. Use the left and right arrow keys to change week.`}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: focusable so the arrow keys can change week
      tabIndex={0}
      onKeyDown={handleKeyDown}
      {...swipe.handlers}
      className="touch-pan-y overflow-hidden rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
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
        {pages.map((days, index) => (
          <div
            key={days[0]?.date ?? index}
            // Room for a pill's focus ring inside the clipped viewport.
            className="w-1/3 p-1"
            // Only the visible week is reachable; the neighbours are there to swipe to.
            inert={index !== 1}
          >
            <WeekStrip
              days={days}
              today={today}
              onSelectDay={onSelectDay}
              readBefore={pages[index - 1]?.at(-1)?.status === "completed"}
              readAfter={pages[index + 1]?.[0]?.status === "completed"}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
