import type { CanonIndex } from "@/data/bible/canon-index";
import { describePassages } from "@/features/progress/domain/reading-journal";
import {
  calculateStreaks,
  type StreakSummary,
} from "@/features/progress/domain/streak";
import type { ReadingView } from "@/features/reading-plan/domain/reading-view";
import {
  getEarliestPlanStart,
  isScheduledDay,
} from "@/features/reading-plan/domain/schedule";
import { addDaysToDateKey, compareDateKeys } from "@/utils/date-key";

export interface FriendDaySummary {
  /** What the friend read today, extras included. Null when nothing is recorded yet. */
  readonly todayPassages: string | null;
  /** Scheduled days missed in a row, counting back from yesterday. Today is not counted. */
  readonly missedInARow: number;
  readonly streak: StreakSummary;
}

/**
 * How a friend is keeping up, from the same view the calendar and streaks read.
 *
 * Any recorded reading ends the missed run, an extra included, matching how streaks
 * treat a day. Days the plan did not expect a reading (before it began, after the canon
 * was finished) are skipped rather than counted as missed.
 */
export function summariseFriendDay(
  view: ReadingView,
  index: CanonIndex,
): FriendDaySummary {
  const { plans, completionLookup, scheduleContext, today } = view;

  const todayRows = completionLookup.get(today);
  const todayPassages =
    todayRows !== undefined && todayRows.length > 0
      ? describePassages(todayRows, index)
      : null;

  let missedInARow = 0;
  const start = getEarliestPlanStart(plans);
  if (start !== null) {
    for (
      let date = addDaysToDateKey(today, -1);
      compareDateKeys(date, start) >= 0;
      date = addDaysToDateKey(date, -1)
    ) {
      if (!isScheduledDay(plans, date, scheduleContext)) continue;
      if (completionLookup.has(date)) break;
      missedInARow += 1;
    }
  }

  const streak = calculateStreaks({
    plans,
    completions: completionLookup,
    context: scheduleContext,
    today,
  });

  return { todayPassages, missedInARow, streak };
}

function describeStreakPart({ current, longest }: StreakSummary): string {
  return `${current} day streak · longest ${longest}`;
}

/** The copy for the profile's today card. */
export function describeFriendToday(summary: FriendDaySummary): {
  headline: string;
  detail: string;
} {
  const streakPart = describeStreakPart(summary.streak);

  if (summary.todayPassages !== null) {
    return {
      headline: `Read today: ${summary.todayPassages}`,
      detail: streakPart,
    };
  }

  const headline = "Hasn't read yet today";
  if (summary.missedInARow === 0) return { headline, detail: streakPart };
  if (summary.missedInARow === 1) {
    return { headline, detail: `Missed yesterday · ${streakPart}` };
  }
  return {
    headline,
    detail: `Missed the last ${summary.missedInARow} days · ${streakPart}`,
  };
}
