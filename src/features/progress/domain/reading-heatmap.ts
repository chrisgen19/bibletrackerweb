import { format } from "date-fns";

import type { BibleReference } from "@/data/bible/canon";
import type { CanonIndex } from "@/data/bible/canon-index";
import { distinctReferences } from "@/features/reading-plan/domain/reference";
import type { ReadingCompletion } from "@/features/reading-plan/domain/types";
import {
  addDaysToDateKey,
  compareDateKeys,
  type DateKey,
  fromDateKey,
} from "@/utils/date-key";

import { type MonthKey, monthKeyFromDateKey } from "./calendar-month";
import { describePassages } from "./reading-journal";

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

/** Worded as the journal words the same day, so a square and its row never disagree. */
export function summarizeDay(
  rows: readonly ReadingCompletion[] | undefined,
  index: CanonIndex,
): DaySummary | null {
  if (rows === undefined || rows.length === 0) return null;
  const plan = rows.filter((row) => row.isExtra !== true);
  const extras = rows.filter((row) => row.isExtra === true);
  return {
    passage: plan.length === 0 ? null : describePassages(plan, index),
    extra: extras.length === 0 ? null : describePassages(extras, index),
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
