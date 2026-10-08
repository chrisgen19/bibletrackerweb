import { useCallback, useMemo } from "react";

import type { BibleReference } from "@/data/bible/canon";
import { getCanonIndex } from "@/data/bible/canon-index";
import { getChapterProgress } from "@/features/reading-plan/domain/chapter-progress";
import {
  getReadThrough,
  getRecordedReadThrough,
  selectProgressCompletions,
} from "@/features/reading-plan/domain/read-through";
import { classifyCustomReading } from "@/features/reading-plan/domain/reading-kind";
import { getChapterCompletionDate } from "@/features/reading-plan/domain/reading-position";
import { getDayReading } from "@/features/reading-plan/domain/schedule";
import type { ReadingCompletion } from "@/features/reading-plan/domain/types";
import { useReadingData } from "@/features/reading-plan/hooks/reading-data-provider";
import { isValidDateKey } from "@/utils/date-key";

import type { DayDetailProps } from "../components/day-detail/types";

const NO_ROWS: readonly ReadingCompletion[] = [];

/**
 * Everything the day detail shows for `date`, from the reading data (bibletrackerapp's
 * app/day/[date].tsx). Null when the date is not a real day.
 *
 * The sheet works from the plan's view, so a day holding only an extra reading still
 * offers its plan reading; the extras are listed on their own (`extraRows`).
 */
export function useDayDetail(
  date: string,
  book: string | undefined,
  chapter: string | undefined,
): DayDetailProps | null {
  const data = useReadingData();
  const {
    plans,
    progressReadings,
    planCompletionLookup,
    completionLookup,
    planScheduleContext: scheduleContext,
    today,
  } = data;
  const isValid = isValidDateKey(date);

  const day = useMemo(
    () => (isValid ? getDayReading(plans, date, scheduleContext) : null),
    [isValid, date, plans, scheduleContext],
  );
  const canonId = day?.plan?.canonId ?? "protestant";

  const rows =
    day === null ? NO_ROWS : (planCompletionLookup.get(day.date) ?? NO_ROWS);

  /**
   * The readings a chapter's progress is measured against: those of the read-through it
   * was recorded in on this day, else the viewed day's. A day from an earlier time
   * through the Bible still reads as completed once a new read-through has begun, and on
   * the day one starts, the chapter that finished the last one is not unread in it.
   */
  const completionsFor = useCallback(
    (reference: BibleReference) => {
      const readThrough =
        getRecordedReadThrough(plans, rows, reference) ??
        (day === null || day.plan === null ? null : getReadThrough(day.plan));
      return readThrough === null
        ? progressReadings
        : selectProgressCompletions(plans, data.completions, readThrough);
    },
    [day, rows, plans, data.completions, progressReadings],
  );

  /**
   * Progress on the day's single scheduled chapter, across every day it was touched.
   * Verse tracking is offered only for a one-chapter day.
   */
  const progress = useMemo(() => {
    if (day === null || day.scheduled.kind !== "scheduled") return null;
    const chapters = day.scheduled.chapters;
    const only = chapters.length === 1 ? chapters[0] : undefined;
    if (only === undefined) return null;
    return getChapterProgress(
      completionsFor(only),
      only,
      getCanonIndex(canonId),
    );
  }, [day, completionsFor, canonId]);

  /**
   * Arriving from the unfinished list: open Custom with that chapter selected, so the
   * remaining verses are recorded against the day being viewed rather than back-dated to
   * whenever the chapter was started.
   */
  const focusChapter = useMemo(() => {
    if (book === undefined || chapter === undefined) return null;
    const parsed = Number(chapter);
    if (!Number.isInteger(parsed)) return null;
    const reference = { bookId: book, chapter: parsed };
    return getCanonIndex(canonId).isValidReference(reference)
      ? reference
      : null;
  }, [book, chapter, canonId]);

  if (day === null) return null;
  const index = getCanonIndex(canonId);
  // A day from an earlier read-through stores its readings there, so a Custom reading on
  // it is classified there too. That read-through was finished when the next one began,
  // so it has no queue: a new chapter on such a day is an extra.
  const earlier =
    day.plan !== null && getReadThrough(day.plan) !== data.currentReadThrough
      ? day.plan
      : null;

  return {
    day,
    today,
    onComplete: (chapters, verses, options) =>
      data.completeReading(day.date, chapters, verses, options),
    onUndo: () => data.undoReading(day.date),
    onUndoEntry: data.undoReadingEntry,
    onChangePlan: data.changePlan,
    completions: planCompletionLookup,
    rows,
    extraRows: (completionLookup.get(day.date) ?? []).filter(
      (row) => row.isExtra === true,
    ),
    onSetExtra: data.setReadingExtra,
    onCountTowardPlan: data.countTowardPlan,
    classifyReading: (reference: BibleReference) =>
      classifyCustomReading(
        earlier === null
          ? {
              reference,
              planReadings: progressReadings,
              unread: scheduleContext.unread,
              plan: data.activePlan,
              index,
            }
          : {
              reference,
              planReadings: selectProgressCompletions(
                plans,
                data.completions,
                getReadThrough(earlier),
              ),
              unread: [],
              plan: earlier,
              index,
            },
      ),
    progress,
    getProgressFor: (reference: BibleReference) =>
      getChapterProgress(completionsFor(reference), reference, index),
    getCompletedOnFor: (reference: BibleReference) =>
      getChapterCompletionDate(completionsFor(reference), reference, index),
    // The head of the unread queue: where the reader actually is.
    currentPosition: scheduleContext.unread[0] ?? null,
    focusChapter,
  };
}
