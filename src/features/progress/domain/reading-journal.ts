import { format } from "date-fns";

import type { BibleReference, VerseRange } from "@/data/bible/canon";
import type { CanonIndex } from "@/data/bible/canon-index";
import {
  formatReference,
  formatReferenceSpan,
} from "@/features/reading-plan/domain/reference";
import {
  type CompletionLookup,
  getDayReading,
  isScheduledDay,
  type ScheduleContext,
} from "@/features/reading-plan/domain/schedule";
import type {
  ReadingCompletion,
  ReadingPlan,
} from "@/features/reading-plan/domain/types";
import {
  formatVerseRanges,
  isChapterComplete,
  mergeVerseRanges,
  wholeChapter,
} from "@/features/reading-plan/domain/verse-range";
import {
  addDaysToDateKey,
  compareDateKeys,
  type DateKey,
  fromDateKey,
} from "@/utils/date-key";

const DAYS_PER_WEEK = 7;

/** The Sunday that starts `date`'s week, matching the Sunday-first calendar grid. */
export function startOfWeekKey(date: DateKey): DateKey {
  return addDaysToDateKey(date, -fromDateKey(date).getDay());
}

/** "This week", "Last week", "Next week", then "Week of 12 Oct" (with the year once it differs). */
export function describeWeek(weekStart: DateKey, today: DateKey): string {
  const current = startOfWeekKey(today);
  const offset = Math.round(
    (fromDateKey(weekStart).getTime() - fromDateKey(current).getTime()) /
      (DAYS_PER_WEEK * 86_400_000),
  );
  if (offset === 0) return "This week";
  if (offset === -1) return "Last week";
  if (offset === 1) return "Next week";
  const start = fromDateKey(weekStart);
  const sameYear = start.getFullYear() === fromDateKey(today).getFullYear();
  return `Week of ${format(start, sameYear ? "d MMM" : "d MMM yyyy")}`;
}

interface ChapterRead {
  reference: BibleReference;
  /** Merged verse spans, or null when the chapter was read whole. */
  verses: readonly VerseRange[] | null;
}

/** One entry per chapter, in canon order: a chapter read in two sittings is one chapter. */
function collectChapters(
  rows: readonly ReadingCompletion[],
  index: CanonIndex,
): ChapterRead[] {
  const byChapter = new Map<
    string,
    { ref: BibleReference; ranges: VerseRange[]; whole: boolean }
  >();
  for (const row of rows) {
    const key = `${row.bookId}:${row.chapter}`;
    const entry = byChapter.get(key) ?? {
      ref: { bookId: row.bookId, chapter: row.chapter },
      ranges: [],
      whole: false,
    };
    if (row.verses === null) entry.whole = true;
    else entry.ranges.push(row.verses);
    byChapter.set(key, entry);
  }

  const position = (ref: BibleReference) =>
    index.toAbsoluteIndex(ref) ?? Number.MAX_SAFE_INTEGER;
  return [...byChapter.values()]
    .sort((a, b) => position(a.ref) - position(b.ref))
    .map(({ ref, ranges, whole }) => {
      const verseCount = index.getVerseCount(ref);
      if (whole || verseCount === null) return { reference: ref, verses: null };
      return isChapterComplete(ranges, verseCount)
        ? { reference: ref, verses: null }
        : { reference: ref, verses: mergeVerseRanges(ranges, verseCount) };
    });
}

/**
 * What a day's rows read as: whole chapters joined into spans (Genesis 12 to 14
 * reads as one span), and a chapter read only in part with its verses (Psalms 119:1 to 40).
 */
export function describePassages(
  rows: readonly ReadingCompletion[],
  index: CanonIndex,
): string {
  const parts: string[] = [];
  let run: BibleReference[] = [];
  const flush = () => {
    if (run.length > 0) parts.push(formatReferenceSpan(run, index));
    run = [];
  };

  for (const { reference, verses } of collectChapters(rows, index)) {
    if (verses !== null) {
      flush();
      parts.push(
        `${formatReference(reference, index)}:${formatVerseRanges(verses)}`,
      );
      continue;
    }
    const last = run[run.length - 1];
    const continues =
      last !== undefined &&
      last.bookId === reference.bookId &&
      last.chapter + 1 === reference.chapter;
    if (!continues) flush();
    run.push(reference);
  }
  flush();
  return parts.join(", ");
}

/** How a day joins the one next to it: read on both, or read and an open today. */
export type ThreadLink = "chain" | "open" | "none";

export type JournalEntry =
  | {
      readonly kind: "read";
      readonly date: DateKey;
      readonly passage: string;
      /** Extra readings beside the plan's, when the day held both. */
      readonly extras: string | null;
      readonly above: ThreadLink;
      readonly below: ThreadLink;
    }
  | {
      readonly kind: "today";
      readonly date: DateKey;
      /** The plan's reading for today, when there is one. */
      readonly next: string | null;
      readonly below: ThreadLink;
    }
  | {
      /** One or more days in a row with nothing logged, folded into a single line. */
      readonly kind: "quiet";
      readonly newest: DateKey;
      readonly oldest: DateKey;
      readonly days: number;
    };

export interface JournalWeek {
  readonly start: DateKey;
  readonly label: string;
  /** How the chain crosses this week's heading, from its Saturday to the next Sunday. */
  readonly threaded: ThreadLink;
  /** Newest first. */
  readonly entries: readonly JournalEntry[];
}

export interface JournalInput {
  readonly plans: readonly ReadingPlan[];
  readonly completions: CompletionLookup;
  readonly context: ScheduleContext;
  readonly today: DateKey;
  /** The earliest day with anything to show: the plan's start or the first reading. */
  readonly firstDate: DateKey | null;
  readonly weeks: number;
  readonly index: CanonIndex;
}

function readEntry(
  date: DateKey,
  rows: readonly ReadingCompletion[],
  isRead: (date: DateKey) => boolean,
  { today, index }: JournalInput,
): JournalEntry {
  const plan = rows.filter((row) => row.isExtra !== true);
  const extra = rows.filter((row) => row.isExtra === true);
  const newer = addDaysToDateKey(date, 1);
  const older = addDaysToDateKey(date, -1);
  return {
    kind: "read",
    date,
    passage: describePassages(plan.length > 0 ? plan : extra, index),
    extras:
      plan.length > 0 && extra.length > 0
        ? describePassages(extra, index)
        : null,
    above: isRead(newer) ? "chain" : newer === today ? "open" : "none",
    below: isRead(older) ? "chain" : "none",
  };
}

/** One week's days, newest first, with runs of unread days folded into one entry. */
function weekEntries(
  start: DateKey,
  isRead: (date: DateKey) => boolean,
  input: JournalInput & { firstDate: DateKey },
): JournalEntry[] {
  const { plans, context, completions, today, firstDate, index } = input;
  const entries: JournalEntry[] = [];
  for (let d = DAYS_PER_WEEK - 1; d >= 0; d -= 1) {
    const date = addDaysToDateKey(start, d);
    if (compareDateKeys(date, today) > 0) continue;
    if (compareDateKeys(date, firstDate) < 0) break;

    const rows = isRead(date) ? (completions.get(date) ?? []) : [];
    const last = entries[entries.length - 1];
    if (rows.length > 0) {
      entries.push(readEntry(date, rows, isRead, input));
    } else if (date === today) {
      const day = getDayReading(plans, today, context);
      entries.push({
        kind: "today",
        date,
        next:
          day.scheduled.kind === "scheduled"
            ? formatReferenceSpan(day.scheduled.chapters, index)
            : null,
        below: isRead(addDaysToDateKey(date, -1)) ? "open" : "none",
      });
    } else if (last?.kind === "quiet") {
      entries[entries.length - 1] = {
        ...last,
        oldest: date,
        days: last.days + 1,
      };
    } else {
      entries.push({ kind: "quiet", newest: date, oldest: date, days: 1 });
    }
  }
  return entries;
}

/**
 * The reading journal: weeks newest first, each day's passages, and the chain of read
 * days joining them. Unread days are folded into quiet lines rather than listed one by
 * one, so a gap reads as a pause, not a list of failures.
 */
export function buildReadingJournal(input: JournalInput): JournalWeek[] {
  const { completions, today, firstDate, weeks } = input;
  if (firstDate === null || compareDateKeys(firstDate, today) > 0) return [];

  const isRead = (date: DateKey) =>
    compareDateKeys(date, today) <= 0 && completions.has(date);
  const result: JournalWeek[] = [];
  const thisWeek = startOfWeekKey(today);

  for (let w = 0; w < weeks; w += 1) {
    const start = addDaysToDateKey(thisWeek, -DAYS_PER_WEEK * w);
    const end = addDaysToDateKey(start, DAYS_PER_WEEK - 1);
    if (compareDateKeys(end, firstDate) < 0) break;

    const nextSunday = addDaysToDateKey(end, 1);
    const crossing: ThreadLink = isRead(nextSunday)
      ? "chain"
      : nextSunday === today
        ? "open"
        : "none";
    result.push({
      start,
      label: describeWeek(start, today),
      threaded: w === 0 || !isRead(end) ? "none" : crossing,
      entries: weekEntries(start, isRead, { ...input, firstDate }),
    });
  }
  return result;
}

export interface RecentReading {
  /** Days read among the last seven reading days. */
  readonly readDays: number;
  /** Reading days in that window: fewer than seven while the plan is new. */
  readonly windowDays: number;
  /** Chapters finished this calendar month, extras included. */
  readonly chaptersThisMonth: number;
}

/**
 * Distinct chapters finished from `from` to `to`, extras included.
 *
 * A chapter is finished on the day its sittings first add up to all of it, so verses 1 to
 * 10 on 31 January and the rest on 1 February finish it in February, as the reading
 * plan's own progress counts it. Once whole, the next sitting starts the chapter afresh,
 * so reading it again in a later read-through finishes it again.
 */
export function countChaptersFinished(
  rows: readonly ReadingCompletion[],
  range: { from: DateKey; to: DateKey },
  index: CanonIndex,
): number {
  const sorted = [...rows].sort(
    (a, b) =>
      compareDateKeys(a.localDate, b.localDate) ||
      a.completedAt - b.completedAt,
  );
  const sittings = new Map<string, VerseRange[]>();
  const finished = new Set<string>();

  for (const row of sorted) {
    if (compareDateKeys(row.localDate, range.to) > 0) break;
    const key = `${row.bookId}:${row.chapter}`;
    const verseCount = index.getVerseCount(row);
    const ranges = sittings.get(key) ?? [];
    if (verseCount !== null)
      ranges.push(row.verses ?? wholeChapter(verseCount));
    // A chapter the canon cannot measure counts as whole, as collectChapters treats it.
    if (verseCount !== null && !isChapterComplete(ranges, verseCount)) {
      sittings.set(key, ranges);
      continue;
    }
    sittings.delete(key);
    if (compareDateKeys(row.localDate, range.from) >= 0) finished.add(key);
  }
  return finished.size;
}

/**
 * The numbers behind the journal's one-line summary. The week ends yesterday while today
 * is still unread, so a morning never counts as a missed day.
 */
export function summariseRecentReading({
  plans,
  completions,
  rows,
  context,
  today,
  index,
}: Omit<JournalInput, "weeks" | "firstDate"> & {
  /** Every reading, not just this month's: a chapter can be begun before the 1st. */
  readonly rows: readonly ReadingCompletion[];
}): RecentReading {
  const end = completions.has(today) ? today : addDaysToDateKey(today, -1);
  let readDays = 0;
  let windowDays = 0;
  for (let i = 0; i < DAYS_PER_WEEK; i += 1) {
    const date = addDaysToDateKey(end, -i);
    if (!isScheduledDay(plans, date, context)) continue;
    windowDays += 1;
    if (completions.has(date)) readDays += 1;
  }

  const chaptersThisMonth = countChaptersFinished(
    rows,
    { from: `${today.slice(0, 8)}01`, to: today },
    index,
  );

  return { readDays, windowDays, chaptersThisMonth };
}

/**
 * "5 of the last 7 days. 23 chapters this month." Null when there is nothing to say yet.
 * A week with no reading says nothing about it: the summary encourages, it never tallies
 * what was missed.
 */
export function describeRecentReading(recent: RecentReading): string | null {
  const parts: string[] = [];
  if (recent.readDays > 0) {
    parts.push(
      recent.windowDays < DAYS_PER_WEEK
        ? `${recent.readDays} of ${recent.windowDays} ${recent.windowDays === 1 ? "day" : "days"} since you began.`
        : `${recent.readDays} of the last ${recent.windowDays} days.`,
    );
  }
  if (recent.chaptersThisMonth > 0) {
    const unit = recent.chaptersThisMonth === 1 ? "chapter" : "chapters";
    parts.push(`${recent.chaptersThisMonth} ${unit} this month.`);
  }
  return parts.length === 0 ? null : parts.join(" ");
}
