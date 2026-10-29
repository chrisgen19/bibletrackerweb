import { useState } from "react";

import { useMediaQuery } from "@/hooks/use-media-query";
import type { CalendarViewPreference } from "@/lib/settings";
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

export type CalendarMode = CalendarViewPreference;

/** Where the home screen turns into two columns, and the calendar opens on the month. */
export const DESKTOP_QUERY = "(min-width: 1024px)";

/** A choice per side of the breakpoint, so turning a tablet never carries one across. */
interface Choices {
  readonly desktop: CalendarMode | null;
  readonly phone: CalendarMode | null;
}

const NO_CHOICES: Choices = { desktop: null, phone: null };

// What the reader picked in this tab, kept until the next full load: coming back to the
// home screen, or pressing Back to a page rendered before the choice was stored, opens
// on it. Tied to the reader, as signing in as someone else does not reload the page.
let thisVisit: { readerId: string; choices: Choices } | null = null;

function choicesThisVisit(readerId: string): Choices {
  return thisVisit?.readerId === readerId ? thisVisit.choices : NO_CHOICES;
}

export interface CalendarView {
  mode: CalendarMode;
  /**
   * True while the reader has not chosen and the starting view still depends on a screen
   * width the server cannot see: the week strip below desktop width, the month above it.
   */
  followsWidth: boolean;
  /** The Sunday of the week the strip shows. */
  weekStart: DateKey;
  monthKey: MonthKey;
  /** Steps a week in the strip, a month in the grid. */
  step: (step: number) => void;
  toggle: () => void;
  /** Provided only while the reader is looking away from today's week or month. */
  returnToToday?: () => void;
}

interface CalendarViewOptions {
  /** The signed-in reader, so one reader's choices never open for the next. */
  readerId: string;
  /** The view last chosen on a phone, from the reader's account. */
  savedView: CalendarMode;
  /** Called with a choice made below desktop width, to store it on the account. */
  onRemember: (mode: CalendarMode) => void;
}

/**
 * Which week or month the calendar shows. Desktop opens on the month; a phone opens on
 * the view last chosen on one. Expanding opens the month holding the week in view, and
 * collapsing returns to today's week when that month is the current one, else to the
 * month's first week.
 */
export function useCalendarView(
  today: DateKey,
  { readerId, savedView, onRemember }: CalendarViewOptions,
): CalendarView {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [choices, setChoices] = useState(() => choicesThisVisit(readerId));
  const [weekStart, setWeekStart] = useState(() => startOfWeekKey(today));
  const [monthKey, setMonthKey] = useState(() => monthKeyFromDateKey(today));

  const side = isDesktop ? "desktop" : "phone";
  const mode = choices[side] ?? (isDesktop ? "month" : savedView);

  const currentWeek = startOfWeekKey(today);
  const currentMonth = monthKeyFromDateKey(today);
  const atToday =
    mode === "week"
      ? weekStart === currentWeek
      : monthKeysEqual(monthKey, currentMonth);

  function choose(next: CalendarMode) {
    const updated = { ...choices, [side]: next };
    setChoices(updated);
    thisVisit = { readerId, choices: updated };
    if (!isDesktop) onRemember(next);
  }

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
      choose("month");
      return;
    }
    setWeekStart(
      monthKeysEqual(monthKey, currentMonth)
        ? currentWeek
        : startOfWeekKey(toDateKey(monthKeyToDate(monthKey))),
    );
    choose("week");
  }

  function step(amount: number) {
    if (mode === "week")
      setWeekStart((start) => addDaysToDateKey(start, 7 * amount));
    else setMonthKey((key) => addMonthsToMonthKey(key, amount));
  }

  return {
    mode,
    followsWidth: !isDesktop && choices.phone === null && mode === "week",
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
