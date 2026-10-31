import type { ReadingSnapshot } from "@/lib/dal";
import type { DateKey } from "@/utils/date-key";

import {
  getCurrentReadThrough,
  getReadThroughFinishDates,
  getSegmentFinishDates,
  selectProgressCompletions,
} from "./read-through";
import { selectPlanReadings } from "./reading-kind";
import {
  type CompletionLookup,
  createCompletionLookup,
  createScheduleContext,
  type ScheduleContext,
} from "./schedule";
import type { ReadingCompletion, ReadingPlan } from "./types";

/**
 * Everything derived from a reader's snapshot that the calendar, heatmap, streaks and
 * journal read. It holds no writes, so the same screens can show the reader's own data or
 * a friend's (see `ReadingViewProvider`).
 */
export interface ReadingView {
  plans: readonly ReadingPlan[];
  activePlan: ReadingPlan | null;
  /** Every recorded reading, extras included: what each day holds. */
  completions: readonly ReadingCompletion[];
  completionLookup: CompletionLookup;
  /** The calendar's view: day status and streaks count every reading. */
  scheduleContext: ScheduleContext;
  /** Plan readings from every read-through: what each day holds for the plan. */
  planReadings: readonly ReadingCompletion[];
  planCompletionLookup: CompletionLookup;
  /**
   * The current read-through's plan readings: chapter progress, "still to finish",
   * chapters read and the queue (bibletrackerweb#18).
   */
  progressReadings: readonly ReadingCompletion[];
  /** Which time through the Bible is in progress (1 for most readers). */
  currentReadThrough: number;
  /** How many times the Bible has been read through. */
  finishedReadThroughs: number;
  /** The current read-through is finished, so the next can start from Genesis 1. */
  canStartNextReadThrough: boolean;
  /**
   * The plan's view, where extra readings do not exist: today's card and the day sheet,
   * so a day holding only an extra still offers its plan reading.
   */
  planScheduleContext: ScheduleContext;
  today: DateKey;
}

/** Derives a {@link ReadingView} from a snapshot and the viewer's current day. Pure. */
export function deriveReadingView(
  snapshot: ReadingSnapshot,
  today: DateKey,
): ReadingView {
  const { plans, activePlan, completions } = snapshot;
  const planReadings = selectPlanReadings(completions);
  const currentReadThrough = getCurrentReadThrough(plans, activePlan);
  const progressReadings = selectProgressCompletions(
    plans,
    completions,
    currentReadThrough,
  );
  const finishedOn = getReadThroughFinishDates(plans, completions);
  // Each segment's own finish line, measured in its read-through, so the days between
  // finishing one read-through and starting the next stay finished rather than missed.
  const segmentFinishes = getSegmentFinishDates(plans, completions, today);
  const contextFor = (rows: readonly ReadingCompletion[]): ScheduleContext => ({
    ...createScheduleContext(plans, rows, today, undefined, progressReadings),
    canonFinishedOnByPlan: segmentFinishes,
  });
  return {
    plans,
    activePlan,
    completions,
    completionLookup: createCompletionLookup(completions),
    scheduleContext: contextFor(completions),
    planReadings,
    planCompletionLookup: createCompletionLookup(planReadings),
    planScheduleContext: contextFor(planReadings),
    progressReadings,
    currentReadThrough,
    finishedReadThroughs: finishedOn.size,
    canStartNextReadThrough:
      activePlan !== null && finishedOn.has(currentReadThrough),
    today,
  };
}

/**
 * Whose reading the screens show. Copy that speaks to the reader ("your plan") reads as the
 * viewer's own data on a friend's profile, so it switches to the third person there.
 */
export type ReadingPerspective = "self" | "friend";
