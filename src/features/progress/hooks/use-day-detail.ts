import { useMemo } from "react";

import type { BibleReference } from "@/data/bible/canon";
import { getCanonIndex } from "@/data/bible/canon-index";
import { getChapterProgress } from "@/features/reading-plan/domain/chapter-progress";
import { classifyCustomReading } from "@/features/reading-plan/domain/reading-kind";
import { getChapterCompletionDate } from "@/features/reading-plan/domain/reading-position";
import { getDayReading } from "@/features/reading-plan/domain/schedule";
import { useReadingData } from "@/features/reading-plan/hooks/reading-data-provider";
import { isValidDateKey } from "@/utils/date-key";

import type { DayDetailProps } from "../components/day-detail/types";

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
    planReadings: completions,
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

  /**
   * Progress on the day's single scheduled chapter, across every day it was touched.
   * Verse tracking is offered only for a one-chapter day.
   */
  const progress = useMemo(() => {
    if (day === null || day.scheduled.kind !== "scheduled") return null;
    const chapters = day.scheduled.chapters;
    const only = chapters.length === 1 ? chapters[0] : undefined;
    if (only === undefined) return null;
    return getChapterProgress(completions, only, getCanonIndex(canonId));
  }, [day, completions, canonId]);

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

  return {
    day,
    today,
    onComplete: (chapters, verses, options) =>
      data.completeReading(day.date, chapters, verses, options),
    onUndo: () => data.undoReading(day.date),
    onUndoEntry: data.undoReadingEntry,
    onChangePlan: data.changePlan,
    completions: planCompletionLookup,
    rows: planCompletionLookup.get(day.date) ?? [],
    extraRows: (completionLookup.get(day.date) ?? []).filter(
      (row) => row.isExtra === true,
    ),
    onSetExtra: data.setReadingExtra,
    classifyReading: (reference: BibleReference) =>
      classifyCustomReading({
        reference,
        planReadings: completions,
        unread: scheduleContext.unread,
        plan: data.activePlan,
        index,
      }),
    progress,
    getProgressFor: (reference: BibleReference) =>
      getChapterProgress(completions, reference, index),
    getCompletedOnFor: (reference: BibleReference) =>
      getChapterCompletionDate(completions, reference, index),
    // The head of the unread queue: where the reader actually is.
    currentPosition: scheduleContext.unread[0] ?? null,
    focusChapter,
  };
}
