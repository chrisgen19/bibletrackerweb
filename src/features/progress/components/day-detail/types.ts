import type { BibleReference, VerseRange } from "@/data/bible/canon";
import type { ChapterProgress } from "@/features/reading-plan/domain/chapter-progress";
import type { CompletionLookup } from "@/features/reading-plan/domain/schedule";
import type {
  DayReading,
  ReadingCompletion,
  ReadingPlanDraft,
} from "@/features/reading-plan/domain/types";
import type { DateKey } from "@/utils/date-key";

/** Everything the day detail and its panels work from (bibletrackerapp's DayDetailProps). */
export interface DayDetailProps {
  day: DayReading;
  today: DateKey;
  /** Returns false when nothing was written, so no success is shown. */
  onComplete: (
    chapters: readonly BibleReference[],
    verses?: VerseRange,
  ) => boolean;
  onUndo: () => void;
  /** Removes one recorded reading, so a day with several keeps the rest. */
  onUndoEntry: (id: string) => void;
  /** Moves the reading position so the next unread day follows on from a logged chapter. */
  onChangePlan: (draft: ReadingPlanDraft) => void;
  /** Lets a continuation skip days that are already recorded. */
  completions: CompletionLookup;
  /** The rows recorded on this day, so each can be described and removed on its own. */
  rows: readonly ReadingCompletion[];
  /** Progress on the scheduled chapter across every day it was touched, or null. */
  progress: ChapterProgress | null;
  /** Progress for any chapter, so the Custom tab can resume an unfinished one. */
  getProgressFor: (reference: BibleReference) => ChapterProgress | null;
  /** When a chapter was finished, so an already-read one can say so. */
  getCompletedOnFor: (reference: BibleReference) => DateKey | null;
  /**
   * The chapter the reader is actually on: the head of the unread queue. Seeds the
   * Custom tab and the catch-up action on a missed day. Without it both fall back to
   * Genesis 1, a valid-looking selection that silently records the wrong chapter.
   */
  currentPosition: BibleReference | null;
  /** Opens straight onto the Custom tab with this chapter selected. */
  focusChapter: BibleReference | null;
}
