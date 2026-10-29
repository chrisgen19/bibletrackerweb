import { format } from "date-fns";

import type { BibleReference } from "@/data/bible/canon";
import type { CanonIndex } from "@/data/bible/canon-index";
import {
  distinctReferences,
  formatReferenceSpan,
} from "@/features/reading-plan/domain/reference";
import type { ReadingCompletion } from "@/features/reading-plan/domain/types";
import {
  formatVerseRanges,
  mergeVerseRanges,
} from "@/features/reading-plan/domain/verse-range";
import {
  addDaysToDateKey,
  compareDateKeys,
  type DateKey,
  fromDateKey,
} from "@/utils/date-key";

import { type MonthKey, monthKeyFromDateKey } from "./calendar-month";

/** What one day holds, ready to show. */
export interface DaySummary {
  /** Plan passages, e.g. "Genesis 24". Null on a day that holds only extra readings. */
  readonly passage: string | null;
  /** Extra readings, outside the plan, e.g. "Psalms 23". */
  readonly extra: string | null;
  /** Distinct chapters read, extras included: the heatmap's intensity. */
  readonly chapters: number;
}

export interface HeatmapInput {
  readonly today: DateKey;
  /** The earliest plan start. Days before it are outside the plan, never quiet. */
  readonly planStart: DateKey | null;
  readonly rowsOn: (date: DateKey) => readonly ReadingCompletion[] | undefined;
  readonly index: CanonIndex;
  readonly weekCount: number;
}

function toReference(row: ReadingCompletion): BibleReference {
  return { bookId: row.bookId, chapter: row.chapter };
}

function chapterKey(reference: BibleReference): string {
  return `${reference.bookId}:${reference.chapter}`;
}

/** Contiguous chapters of one book, so Genesis 1, 2, 3 reads as one span. */
function groupRuns(references: readonly BibleReference[]): BibleReference[][] {
  const runs: BibleReference[][] = [];
  for (const reference of references) {
    const run = runs[runs.length - 1];
    const last = run?.[run.length - 1];
    if (
      run !== undefined &&
      last?.bookId === reference.bookId &&
      last.chapter + 1 === reference.chapter
    ) {
      run.push(reference);
    } else {
      runs.push([reference]);
    }
  }
  return runs;
}

/** "Genesis 24", "Genesis 1-3, Psalms 23", or "Genesis 24:1-20" for part of a chapter. */
export function formatPassages(
  rows: readonly ReadingCompletion[],
  index: CanonIndex,
): string {
  return groupRuns(distinctReferences(rows.map(toReference)))
    .map((run) => {
      const span = formatReferenceSpan(run, index);
      const only = run.length === 1 ? run[0] : undefined;
      if (only === undefined) return span;
      const sittings = rows.filter(
        (row) => chapterKey(row) === chapterKey(only),
      );
      // One whole-chapter sitting makes the chapter whole, whatever else was logged.
      if (sittings.some((row) => row.verses === null)) return span;
      const ranges = sittings.flatMap((row) =>
        row.verses === null ? [] : [row.verses],
      );
      // Sittings can overlap; no clamp is needed, as the rows were checked when saved.
      const merged = mergeVerseRanges(ranges, Number.MAX_SAFE_INTEGER);
      return `${span}:${formatVerseRanges(merged)}`;
    })
    .join(", ");
}

export function summarizeDay(
  rows: readonly ReadingCompletion[] | undefined,
  index: CanonIndex,
): DaySummary | null {
  if (rows === undefined || rows.length === 0) return null;
  const plan = rows.filter((row) => row.isExtra !== true);
  const extras = rows.filter((row) => row.isExtra === true);
  return {
    passage: plan.length === 0 ? null : formatPassages(plan, index),
    extra: extras.length === 0 ? null : formatPassages(extras, index),
    chapters: distinctReferences(rows.map(toReference)).length,
  };
}

export type HeatLevel = 0 | 1 | 2 | 3;

export interface HeatCell {
  readonly date: DateKey;
  /**
   * `read` has a reading; `quiet` is a plan day with none, shown as neutral, never as a
   * warning; `outside` predates the plan; `future` has not happened yet.
   */
  readonly state: "read" | "quiet" | "outside" | "future";
  readonly level: HeatLevel;
  readonly summary: DaySummary | null;
}

export interface HeatMonthLabel {
  readonly key: MonthKey;
  readonly label: string;
  /** Column of the week holding the month's first day (or the first column). */
  readonly week: number;
  /** Columns until the next label: too few and the label has no room. */
  readonly span: number;
}

export interface Heatmap {
  /** Sunday-first weeks, oldest first. The last one holds today. */
  readonly weeks: readonly (readonly HeatCell[])[];
  readonly months: readonly HeatMonthLabel[];
}

export function heatLevel(chapters: number): HeatLevel {
  if (chapters <= 0) return 0;
  if (chapters >= 3) return 3;
  return chapters as HeatLevel;
}

function buildCell(date: DateKey, input: HeatmapInput): HeatCell {
  if (compareDateKeys(date, input.today) > 0)
    return { date, state: "future", level: 0, summary: null };
  const summary = summarizeDay(input.rowsOn(date), input.index);
  if (summary !== null)
    return { date, state: "read", level: heatLevel(summary.chapters), summary };
  const inPlan =
    input.planStart !== null && compareDateKeys(date, input.planStart) >= 0;
  return { date, state: inPlan ? "quiet" : "outside", level: 0, summary };
}

function buildMonthLabels(
  weeks: readonly (readonly HeatCell[])[],
): HeatMonthLabel[] {
  const starts: { key: MonthKey; date: DateKey; week: number }[] = [];
  weeks.forEach((week, column) => {
    const first =
      column === 0
        ? week[week.length - 1]
        : week.find((cell) => cell.date.endsWith("-01"));
    if (first !== undefined)
      starts.push({
        key: monthKeyFromDateKey(first.date),
        date: first.date,
        week: column,
      });
  });
  // The first column takes its Saturday's month, which no later column can start.
  return starts.map((start, i) => ({
    key: start.key,
    label: format(fromDateKey(start.date), "MMM"),
    week: start.week,
    span: (starts[i + 1]?.week ?? weeks.length) - start.week,
  }));
}

/** The last `weekCount` Sunday-first weeks, ending with the week that holds today. */
export function buildHeatmap(input: HeatmapInput): Heatmap {
  const weekday = fromDateKey(input.today).getDay();
  const start = addDaysToDateKey(
    input.today,
    -weekday - 7 * (input.weekCount - 1),
  );
  const weeks: HeatCell[][] = [];
  for (let w = 0; w < input.weekCount; w += 1) {
    const week: HeatCell[] = [];
    for (let d = 0; d < 7; d += 1)
      week.push(buildCell(addDaysToDateKey(start, w * 7 + d), input));
    weeks.push(week);
  }
  return { weeks, months: buildMonthLabels(weeks) };
}
