"use client";

import { type KeyboardEvent, useRef } from "react";

import {
  addDaysToDateKey,
  compareDateKeys,
  type DateKey,
} from "@/utils/date-key";

import {
  type MonthKey,
  monthKeyFromDateKey,
  WEEKDAY_ACCESSIBILITY_LABELS,
} from "../domain/calendar-month";
import type { HeatLevel, Heatmap } from "../domain/reading-heatmap";
import { HEAT_FILL } from "./heat-fill";
import { HeatmapCell } from "./heatmap-cell";
import { HeatmapMonthLabels } from "./heatmap-month-labels";

/** Rows are weekdays and columns are weeks, so up and down step a day, sideways a week. */
const KEY_STEPS: Record<string, number> = {
  ArrowUp: -1,
  ArrowDown: 1,
  ArrowLeft: -7,
  ArrowRight: 7,
};

interface ReadingHeatmapProps {
  heatmap: Heatmap;
  today: DateKey;
  selected: DateKey;
  /** Moves the selection, as the arrow keys do. */
  onSelect: (date: DateKey) => void;
  /** Finds the day in the journal, as a tap or Enter does. */
  onReveal: (date: DateKey) => void;
  onPickMonth: (month: MonthKey) => void;
}

/**
 * The long view: one square per day, deeper brown for more chapters. One tab stop (the
 * selected day); the arrow keys, Home and End move from there, and Enter finds it in the
 * journal.
 */
export function ReadingHeatmap({
  heatmap,
  today,
  selected,
  onSelect,
  onReveal,
  onPickMonth,
}: ReadingHeatmapProps) {
  const grid = useRef<HTMLTableElement>(null);
  const first = heatmap.weeks[0]?.[0]?.date ?? today;

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    date: DateKey,
  ) {
    const step = KEY_STEPS[event.key];
    const next =
      event.key === "Home"
        ? first
        : event.key === "End"
          ? today
          : step === undefined
            ? null
            : addDaysToDateKey(date, step);
    if (next === null) return;
    event.preventDefault();
    if (compareDateKeys(next, first) < 0 || compareDateKeys(next, today) > 0)
      return;
    onSelect(next);
    grid.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)
      ?.focus();
  }

  return (
    <table
      ref={grid}
      className="w-full table-fixed border-separate border-spacing-[2px] sm:border-spacing-[3px]"
    >
      <caption className="sr-only">
        Your reading over the last {heatmap.weeks.length} weeks. Arrow keys move
        between days, Enter finds one in your journal.
      </caption>
      <HeatmapMonthLabels
        months={heatmap.months}
        weekCount={heatmap.weeks.length}
        shownMonth={monthKeyFromDateKey(selected)}
        onPickMonth={onPickMonth}
      />
      <tbody>
        {WEEKDAY_ACCESSIBILITY_LABELS.map((dayName, weekday) => (
          <tr key={dayName}>
            <th
              scope="row"
              className="hidden p-0 pr-1 text-left font-normal text-[0.6875rem] text-faint leading-none sm:table-cell"
            >
              {/* Monday, Wednesday and Friday, as wall calendars thin them out. */}
              {weekday % 2 === 1 ? (
                <span aria-hidden>{dayName.slice(0, 3)}</span>
              ) : null}
              <span className="sr-only">{dayName}</span>
            </th>
            {heatmap.weeks.map((week) => {
              const cell = week[weekday];
              if (cell === undefined) return null;
              return (
                <HeatmapCell
                  key={cell.date}
                  cell={cell}
                  isToday={cell.date === today}
                  isSelected={cell.date === selected}
                  onActivate={onReveal}
                  onKeyDown={handleKeyDown}
                />
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const LEGEND: readonly (readonly [HeatLevel, string])[] = [
  [0, "0"],
  [1, "1"],
  [2, "2"],
  [3, "3+"],
];

/** The ramp with numbers on it, so the shades are never the only way to read it. */
export function HeatmapLegend() {
  return (
    <div className="flex items-center justify-end gap-2 text-footnote text-muted-foreground">
      <span>Chapters a day</span>
      {LEGEND.map(([level, label]) => (
        <span key={label} className="flex items-center gap-1">
          <span
            aria-hidden
            className={`size-2.5 rounded-[3px] ${HEAT_FILL[level]}`}
          />
          {label}
        </span>
      ))}
    </div>
  );
}
