// The decisions inside bibletrackerapp's day-detail.tsx, kept apart from the markup so
// they can be tested without a browser. Copy is the iOS app's, word for word.
import { format } from "date-fns";

import type { BibleReference, VerseRange } from "@/data/bible/canon";
import type { CanonIndex } from "@/data/bible/canon-index";
import type { ChapterProgress } from "@/features/reading-plan/domain/chapter-progress";
import { buildContinuationDraft } from "@/features/reading-plan/domain/continuation";
import {
  distinctReferences,
  formatReference,
  isSameReference,
} from "@/features/reading-plan/domain/reference";
import type { CompletionLookup } from "@/features/reading-plan/domain/schedule";
import type {
  DayReading,
  ReadingCompletion,
  ReadingPlanDraft,
} from "@/features/reading-plan/domain/types";
import { formatVerseRange } from "@/features/reading-plan/domain/verse-range";
import { type DateKey, fromDateKey } from "@/utils/date-key";

/**
 * True when every chapter recorded on this day has no verses left.
 *
 * Taken from the rows rather than from the scheduled chapter's progress: a day can hold
 * a chapter the schedule never named, and a day holding two chapters has no single
 * progress at all. Both used to report a partial read as "completed".
 */
export function areRowsComplete(
  rows: readonly ReadingCompletion[],
  getProgressFor: (reference: BibleReference) => ChapterProgress | null,
): boolean {
  return distinctReferences(
    rows.map((row) => ({ bookId: row.bookId, chapter: row.chapter })),
  ).every((reference) => {
    const progress = getProgressFor(reference);
    // No verse counts means the whole chapter was recorded, which is complete.
    return progress === null || !progress.isPartial;
  });
}

/** `"Leviticus 6:1–7"`, or `"Leviticus 6"` when no span was recorded. */
export function describeRow(row: ReadingCompletion, index: CanonIndex): string {
  const reference = formatReference(
    { bookId: row.bookId, chapter: row.chapter },
    index,
  );
  return row.verses === null
    ? reference
    : `${reference}:${formatVerseRange(row.verses)}`;
}

export type PlanAction =
  | { kind: "future-note" }
  | { kind: "verse-control"; tracked: BibleReference }
  | { kind: "mark"; chapters: readonly BibleReference[] }
  | { kind: "none" };

/** What the plan tab offers under a scheduled day's reading. */
export function planAction(options: {
  day: DayReading;
  isFuture: boolean;
  hasRecord: boolean;
  progress: ChapterProgress | null;
  chapters: readonly BibleReference[];
}): PlanAction {
  const { day, isFuture, hasRecord, progress, chapters } = options;
  if (isFuture) return { kind: "future-note" };
  // Verse tracking only applies to a single scheduled chapter: reading part of several
  // at once is not a thing anyone does. This must stay in step with the chapter
  // `progress` was computed for, which is `day.scheduled.chapters[0]`.
  const scheduled =
    day.scheduled.kind === "scheduled" ? day.scheduled.chapters : [];
  const tracked = scheduled.length === 1 ? scheduled[0] : undefined;
  if (progress !== null && tracked !== undefined) {
    // Nothing left to do only when this day holds the record *and* the chapter is
    // finished. A chapter completed on another date must still be markable here, or a
    // plan change would leave the day with no action at all.
    return hasRecord && progress.isComplete
      ? { kind: "none" }
      : { kind: "verse-control", tracked };
  }
  return hasRecord ? { kind: "none" } : { kind: "mark", chapters };
}

export interface VerseSelection {
  readonly fromVerse: number;
  readonly lastVerse: number;
  readonly endVerse: number;
  readonly span: VerseRange;
  readonly finishesChapter: boolean;
}

/** The span the verse control would record, from the reader's pending choice. */
export function verseSelection(
  progress: ChapterProgress,
  toVerse: number | null,
): VerseSelection {
  const fromVerse = progress.remaining[0]?.from ?? 1;
  const lastVerse = progress.verseCount;
  // A selection below `fromVerse` is stale: progress advanced past it while the sheet
  // stayed open. Treat it as unset rather than building a reversed span; normalise
  // would swap 11–10 into 10–11 and mark a verse read that never was.
  const endVerse =
    toVerse !== null && toVerse >= fromVerse ? toVerse : lastVerse;
  return {
    fromVerse,
    lastVerse,
    endVerse,
    span: { from: fromVerse, to: endVerse },
    finishesChapter: endVerse >= lastVerse,
  };
}

/** Every line of text the verse control shows. */
export function verseControlCopy(options: {
  progress: ChapterProgress;
  selection: VerseSelection;
  verb: "Mark" | "Log";
  chapterLabel: string;
  /** When the chapter was finished, if it is. */
  completedOn: DateKey | null;
  viewedDate: DateKey;
}) {
  const { progress, selection, verb, chapterLabel, completedOn } = options;
  const { span, endVerse, lastVerse, finishesChapter, fromVerse } = selection;
  // A finished chapter leaves `remaining` empty, so `fromVerse` falls back to 1 and the
  // control would otherwise present it as untouched: same field, same label, no hint
  // that logging again adds a second row and inflates the streak.
  const alreadyHere =
    completedOn !== null && completedOn === options.viewedDate;

  return {
    fieldValue: progress.isComplete
      ? `${lastVerse} (whole chapter)`
      : finishesChapter
        ? `${lastVerse} (finishes the chapter)`
        : String(endVerse),
    hint: progress.isComplete
      ? null
      : finishesChapter
        ? "Stopping early? Set how far you got and finish the rest another day."
        : `Recording verses ${formatVerseRange(span)}. Verses ${formatVerseRange(
            {
              from: endVerse + 1,
              to: lastVerse,
            },
          )} stay waiting for you.`,
    alreadyRead: !progress.isComplete
      ? null
      : alreadyHere
        ? `${chapterLabel} is already recorded on this day.`
        : completedOn === null
          ? `${chapterLabel} is already fully read.`
          : `${chapterLabel} is already fully read — completed on ${format(
              fromDateKey(completedOn),
              "d MMMM",
            )}.`,
    submitLabel: progress.isComplete
      ? `${verb} ${chapterLabel} Again`
      : finishesChapter && fromVerse === 1
        ? `${verb} ${chapterLabel} as Read`
        : `${verb} ${chapterLabel}:${formatVerseRange(span)} as Read`,
  };
}

/**
 * What the Custom tab's picker opens on.
 *
 * Order matters. A day that already has a record edits that record; a scheduled day
 * offers its own chapter; anything else (a missed day above all) offers where the reader
 * actually is. `firstReference` is a last resort for a reader with no position at all,
 * never a default: it looks like a real choice, and silently records Genesis 1 for
 * anyone who only changes the verse.
 */
export function initialCustomReference(options: {
  focusChapter: BibleReference | null;
  day: DayReading;
  currentPosition: BibleReference | null;
  index: CanonIndex;
}): BibleReference {
  const { focusChapter, day, currentPosition, index } = options;
  return (
    focusChapter ??
    day.completedChapters[0] ??
    (day.scheduled.kind === "scheduled"
      ? day.scheduled.chapters[0]
      : undefined) ??
    currentPosition ??
    index.firstReference
  );
}

/**
 * After a successful log, the plan change to offer, or null for none.
 *
 * Only a finished chapter may move the position: continuation starts at the chapter
 * *after* this one, so offering it while verses remain unread would advance the plan
 * straight past them. And logging the chapter already at the head of the queue needs no
 * change: the unread queue steps over what is finished by itself, and moving the start
 * would drop any chapters left unread before it.
 */
export function continuationAfterLog(options: {
  reference: BibleReference;
  span: VerseRange | undefined;
  progress: ChapterProgress | null;
  currentPosition: BibleReference | null;
  day: DayReading;
  today: DateKey;
  completions: CompletionLookup;
}): ReadingPlanDraft | null {
  const { reference, span, progress, currentPosition, day } = options;
  if (
    span !== undefined &&
    progress !== null &&
    span.to < progress.verseCount
  ) {
    return null;
  }
  if (currentPosition !== null && isSameReference(reference, currentPosition)) {
    return null;
  }
  return buildContinuationDraft({
    loggedChapter: reference,
    loggedDate: day.date,
    today: options.today,
    plan: day.plan,
    completions: options.completions,
  });
}

/** The "Continue from here?" question, as the iOS alert words it. */
export function continuationMessage(
  reference: BibleReference,
  draft: ReadingPlanDraft,
  index: CanonIndex,
): string {
  const next = formatReference(
    { bookId: draft.startBookId, chapter: draft.startChapter },
    index,
  );
  return `${formatReference(reference, index)} is logged. Would you like your reading plan to carry on from ${next}?\n\nDays you have already completed stay exactly as they are.`;
}

/**
 * The notice after a Custom log is recorded as an extra reading (bibletrackerweb#18):
 * what was logged, where the plan stays, and what accepting would do instead.
 */
export function extraReadingMessage(
  reference: BibleReference,
  currentPosition: BibleReference | null,
  draft: ReadingPlanDraft | null,
  index: CanonIndex,
): string {
  const logged = formatReference(reference, index);
  const stays =
    currentPosition === null
      ? "Your plan stays where it is."
      : `Your plan stays at ${formatReference(currentPosition, index)}.`;
  const instead =
    draft === null
      ? "Count it toward your plan instead?"
      : `Move your plan to carry on from ${formatReference(
          { bookId: draft.startBookId, chapter: draft.startChapter },
          index,
        )} instead? Days you have already completed stay exactly as they are.`;
  return `${logged} is logged as an extra reading. ${stays}\n\n${instead}`;
}

/** Why a day the plan names no chapter for is empty. */
export function unscheduledMessage(
  kind: "canon-complete" | "not-scheduled" | "before-plan",
  /** The day holds extra readings, so it is not empty: only the plan reading is missing. */
  hasExtras = false,
): string {
  if (kind === "not-scheduled" && hasExtras) {
    return "No plan reading was recorded on this day, only the extra reading below. Missing a day doesn’t cost you a chapter: your place in the plan moves as you read, not as days pass.";
  }
  if (kind === "canon-complete") {
    return "You had already finished the entire Bible by this day, so nothing was scheduled.";
  }
  if (kind === "not-scheduled") {
    // The position never moved, so this day cost nothing: there is no chapter it was
    // "supposed" to be, and naming one would be a fiction.
    return "Nothing was recorded on this day. Missing a day doesn’t cost you a chapter — your place in the plan moves as you read, not as days pass.";
  }
  return "Your reading plan hadn’t started yet on this day.";
}
