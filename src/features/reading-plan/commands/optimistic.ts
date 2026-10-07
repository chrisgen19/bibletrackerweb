import type { BibleReference, VerseRange } from "@/data/bible/canon";
import { resolvePlanForDate } from "@/features/reading-plan/domain/schedule";
import type {
  ReadingCompletion,
  ReadingPlan,
  ReadingPlanDraft,
} from "@/features/reading-plan/domain/types";
import type { ReadingSnapshot } from "@/lib/dal";
import {
  addDaysToDateKey,
  compareDateKeys,
  type DateKey,
} from "@/utils/date-key";

/**
 * The snapshot a write will produce, applied before the server answers.
 *
 * Each function mirrors one write in src/lib/dal.ts, so the screen shows what the server
 * is about to store; the server's own snapshot then replaces it. A contract test runs
 * the same writes through both and compares (optimistic-contract.db.test.ts).
 */

/** Ids and timestamps the server would otherwise assign. */
export interface CreatedRow {
  readonly id: string;
  readonly createdAt: number;
}

/** The DAL's plan order: start date, then creation time. */
function byStart(a: ReadingPlan, b: ReadingPlan): number {
  return compareDateKeys(a.startDate, b.startDate) || a.createdAt - b.createdAt;
}

function planFromDraft(
  draft: ReadingPlanDraft,
  created: CreatedRow,
): ReadingPlan {
  return {
    id: created.id,
    canonId: draft.canonId,
    startDate: draft.startDate,
    startBookId: draft.startBookId,
    startChapter: draft.startChapter,
    chaptersPerDay: draft.chaptersPerDay,
    createdAt: created.createdAt,
    isActive: true,
    endDate: null,
  };
}

/** createReadingPlan. */
export function withStartedPlan(
  snapshot: ReadingSnapshot,
  draft: ReadingPlanDraft,
  created: CreatedRow,
): ReadingSnapshot {
  const plan = planFromDraft(draft, created);
  return {
    ...snapshot,
    plans: [...snapshot.plans, plan].sort(byStart),
    activePlan: plan,
  };
}

/** replaceActiveReadingPlan: close every active segment the day before, add the new one. */
export function withChangedPlan(
  snapshot: ReadingSnapshot,
  draft: ReadingPlanDraft,
  created: CreatedRow,
): ReadingSnapshot {
  const closeOn = addDaysToDateKey(draft.startDate, -1);
  const closed = snapshot.plans.map((plan) =>
    plan.isActive ? { ...plan, isActive: false, endDate: closeOn } : plan,
  );
  const plan = planFromDraft(draft, created);
  return {
    ...snapshot,
    plans: [...closed, plan].sort(byStart),
    activePlan: plan,
  };
}

/**
 * The plan a reading on `date` attaches to: the segment governing it, or the active plan
 * for a day no segment covers. `null` means the write would be refused.
 */
export function planForReading(
  snapshot: ReadingSnapshot,
  date: DateKey,
): ReadingPlan | null {
  return resolvePlanForDate(snapshot.plans, date) ?? snapshot.activePlan;
}

export interface OptimisticReading {
  readonly date: DateKey;
  readonly chapters: readonly BibleReference[];
  readonly verses?: VerseRange;
  /** One per chapter, also sent to the server so both sides use the same row ids. */
  readonly ids: readonly string[];
  readonly completedAt: number;
  readonly isExtra?: boolean;
}

/**
 * markReadingComplete: one row per chapter, the span only for a single chapter, and a row
 * whose day + chapter + span already exists is skipped (ON CONFLICT DO NOTHING).
 */
export function withCompletedReading(
  snapshot: ReadingSnapshot,
  reading: OptimisticReading,
): ReadingSnapshot {
  const plan = planForReading(snapshot, reading.date);
  if (plan === null) return snapshot;

  const span = reading.chapters.length === 1 ? reading.verses : undefined;
  const key = (row: {
    localDate: DateKey;
    bookId: string;
    chapter: number;
    verses: VerseRange | null;
  }) =>
    `${row.localDate}|${row.bookId}|${row.chapter}|${row.verses?.from ?? 0}|${row.verses?.to ?? 0}`;
  const taken = new Set(snapshot.completions.map(key));

  const added: ReadingCompletion[] = [];
  reading.chapters.forEach((chapter, position) => {
    const row: ReadingCompletion = {
      id: reading.ids[position] ?? "",
      readingPlanId: plan.id,
      localDate: reading.date,
      bookId: chapter.bookId,
      chapter: chapter.chapter,
      verses: span === undefined ? null : { from: span.from, to: span.to },
      completedAt: reading.completedAt,
      isExtra: reading.isExtra ?? false,
    };
    if (taken.has(key(row))) return;
    taken.add(key(row));
    added.push(row);
  });

  // The DAL orders by day, then insertion; a stable sort keeps new rows last in their day.
  const completions = [...snapshot.completions, ...added].sort((a, b) =>
    compareDateKeys(a.localDate, b.localDate),
  );
  return { ...snapshot, completions };
}

/** removeReadingCompletion: the day's plan readings, leaving its extras. */
export function withoutDay(
  snapshot: ReadingSnapshot,
  date: DateKey,
): ReadingSnapshot {
  return {
    ...snapshot,
    completions: snapshot.completions.filter(
      (row) => row.localDate !== date || row.isExtra === true,
    ),
  };
}

/** removeCompletionById. */
export function withoutEntry(
  snapshot: ReadingSnapshot,
  id: string,
): ReadingSnapshot {
  return {
    ...snapshot,
    completions: snapshot.completions.filter((row) => row.id !== id),
  };
}

/** setReadingExtra. */
export function withReadingExtra(
  snapshot: ReadingSnapshot,
  id: string,
  isExtra: boolean,
): ReadingSnapshot {
  return {
    ...snapshot,
    completions: snapshot.completions.map((row) =>
      row.id === id ? { ...row, isExtra } : row,
    ),
  };
}

/** resetAllProgress. */
export function withReset(): ReadingSnapshot {
  return { plans: [], activePlan: null, completions: [] };
}
