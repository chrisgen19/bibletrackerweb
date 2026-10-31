import { useMemo, useState } from "react";

import { DEFAULT_CANON_ID, getCanonIndex } from "@/data/bible/canon-index";
import { getEarliestPlanStart } from "@/features/reading-plan/domain/schedule";
import {
  useReadingPerspective,
  useReadingView,
} from "@/features/reading-plan/hooks/reading-view-context";
import {
  addDaysToDateKey,
  compareDateKeys,
  type DateKey,
  daysBetweenDateKeys,
  minDateKey,
} from "@/utils/date-key";

import {
  buildReadingJournal,
  describeRecentReading,
  startOfWeekKey,
  summariseRecentReading,
} from "../domain/reading-journal";

const INITIAL_WEEKS = 3;
const MORE_WEEKS = 3;

/** "5 of the last 7 days. 23 chapters this month.", or null before anything is read. */
export function useRecentReadingSummary(): string | null {
  const {
    plans,
    activePlan,
    completions,
    completionLookup,
    scheduleContext,
    today,
  } = useReadingView();
  const perspective = useReadingPerspective();

  return useMemo(
    () =>
      describeRecentReading(
        summariseRecentReading({
          plans,
          completions: completionLookup,
          rows: completions,
          context: scheduleContext,
          today,
          index: getCanonIndex(activePlan?.canonId ?? DEFAULT_CANON_ID),
        }),
        perspective,
      ),
    [
      plans,
      activePlan,
      completions,
      completionLookup,
      scheduleContext,
      today,
      perspective,
    ],
  );
}

/**
 * The reading journal, from the readings already on the client: the snapshot holds every
 * reading, so showing earlier weeks never asks the server.
 */
export function useReadingJournal() {
  const {
    plans,
    activePlan,
    completions,
    completionLookup,
    scheduleContext,
    today,
  } = useReadingView();
  const [weeks, setWeeks] = useState(INITIAL_WEEKS);
  const summary = useRecentReadingSummary();

  const index = useMemo(
    () => getCanonIndex(activePlan?.canonId ?? DEFAULT_CANON_ID),
    [activePlan],
  );

  const firstDate = useMemo(() => {
    let first = getEarliestPlanStart(plans);
    for (const row of completions) {
      first = first === null ? row.localDate : minDateKey(first, row.localDate);
    }
    return first;
  }, [plans, completions]);

  const journal = useMemo(
    () =>
      buildReadingJournal({
        plans,
        completions: completionLookup,
        context: scheduleContext,
        today,
        firstDate,
        weeks,
        index,
      }),
    [plans, completionLookup, scheduleContext, today, firstDate, weeks, index],
  );

  const thisWeek = startOfWeekKey(today);
  const oldestShown = addDaysToDateKey(thisWeek, -7 * (weeks - 1));
  const canShowEarlier =
    firstDate !== null && compareDateKeys(firstDate, oldestShown) < 0;

  return {
    today,
    weeks: journal,
    summary,
    canShowEarlier,
    showEarlier: () => setWeeks((count) => count + MORE_WEEKS),
    /** Loads enough earlier weeks for `date` to be in the journal. */
    showThrough: (date: DateKey) => {
      const needed =
        daysBetweenDateKeys(startOfWeekKey(date), thisWeek) / 7 + 1;
      setWeeks((count) => Math.max(count, needed));
    },
  };
}

export type ReadingJournalState = ReturnType<typeof useReadingJournal>;
