import "server-only";

import type { BibleReference, VerseRange } from "@/data/bible/canon";
import type {
  ReadingCompletion,
  ReadingPlan,
  ReadingPlanDraft,
} from "@/features/reading-plan/domain/types";
import {
  Prisma,
  type ReadingCompletion as ReadingCompletionRow,
  type ReadingPlan as ReadingPlanRow,
} from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { fromDbDate, toDbDate } from "@/lib/db-date";
import {
  type AppearancePreference,
  appearanceSchema,
  DEFAULT_APPEARANCE,
} from "@/lib/settings";
import { addDaysToDateKey, type DateKey } from "@/utils/date-key";
import { isValidTimeZone } from "@/utils/zoned-date-key";

/**
 * The data access layer: the only module that queries the database.
 *
 * Mirrors bibletrackerapp's repositories (reading-plan, completion and settings) one
 * function for one function. Two differences: every function takes the reader's
 * `userId` and touches only that reader's rows, and every call is async. Callers get
 * domain types and never see a Prisma row.
 */

/** The database handle or an open transaction; both expose the same model delegates. */
type Executor = Prisma.TransactionClient;

const PLAN_ORDER: Prisma.ReadingPlanOrderByWithRelationInput[] = [
  { startDate: "asc" },
  { createdAt: "asc" },
];

// SQLite returned same-day rows in insertion order; `seq` reproduces that here.
const COMPLETION_ORDER: Prisma.ReadingCompletionOrderByWithRelationInput[] = [
  { localDate: "asc" },
  { seq: "asc" },
];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toPlan(row: ReadingPlanRow): ReadingPlan {
  return {
    id: row.id,
    canonId: row.canonId,
    startDate: fromDbDate(row.startDate),
    startBookId: row.startBookId,
    startChapter: row.startChapter,
    chaptersPerDay: row.chaptersPerDay,
    createdAt: row.createdAt.getTime(),
    isActive: row.isActive,
    endDate: row.endDate === null ? null : fromDbDate(row.endDate),
  };
}

function toCompletion(row: ReadingCompletionRow): ReadingCompletion {
  return {
    id: row.id,
    readingPlanId: row.readingPlanId,
    localDate: fromDbDate(row.localDate),
    bookId: row.bookId,
    chapter: row.chapter,
    // 0,0 is the "whole chapter, span not recorded" sentinel.
    verses:
      row.fromVerse === 0 && row.toVerse === 0
        ? null
        : { from: row.fromVerse, to: row.toVerse },
    completedAt: row.completedAt.getTime(),
  };
}

function planData(userId: string, draft: ReadingPlanDraft) {
  return {
    userId,
    canonId: draft.canonId,
    startDate: toDbDate(draft.startDate),
    startBookId: draft.startBookId,
    startChapter: draft.startChapter,
    chaptersPerDay: draft.chaptersPerDay,
  };
}

/**
 * Serialises plan changes for one reader, inside the caller's transaction.
 *
 * Two devices moving the position at once would both close the same open segment and
 * both insert a new one, and the one-open-plan index would reject the second. Locking
 * first makes the second wait, then see and close the first one's segment, exactly as
 * if the two changes had happened in turn. Other readers are never blocked.
 */
async function lockReader(tx: Executor, userId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`;
}

function findActivePlan(client: Executor, userId: string) {
  return client.readingPlan.findFirst({
    where: { userId, isActive: true, endDate: null },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
  });
}

function findAllPlans(client: Executor, userId: string) {
  return client.readingPlan.findMany({
    where: { userId },
    orderBy: PLAN_ORDER,
  });
}

function findAllCompletions(client: Executor, userId: string) {
  return client.readingCompletion.findMany({
    where: { userId },
    orderBy: COMPLETION_ORDER,
  });
}

// Reading plans (bibletrackerapp: reading-plan-repository.ts)

/** The open-ended segment, or `null` before onboarding. */
export async function getActiveReadingPlan(
  userId: string,
): Promise<ReadingPlan | null> {
  const row = await findActivePlan(db, userId);
  return row === null ? null : toPlan(row);
}

/** Every segment, oldest first: the timeline the calendar and streaks read from. */
export async function getAllReadingPlans(
  userId: string,
): Promise<ReadingPlan[]> {
  return (await findAllPlans(db, userId)).map(toPlan);
}

export async function createReadingPlan(
  userId: string,
  draft: ReadingPlanDraft,
): Promise<ReadingPlan> {
  return db.$transaction(async (tx) => {
    await lockReader(tx, userId);
    return toPlan(
      await tx.readingPlan.create({ data: planData(userId, draft) }),
    );
  });
}

/**
 * Starts a new plan segment without touching history.
 *
 * The outgoing segment is closed on the day before the new one begins, so every past
 * date keeps resolving to the plan that actually governed it. Completions are never
 * modified.
 */
export async function replaceActiveReadingPlan(
  userId: string,
  draft: ReadingPlanDraft,
): Promise<ReadingPlan> {
  return db.$transaction(async (tx) => {
    await lockReader(tx, userId);
    // The outgoing segment governs up to the day before the new one begins. When both
    // start on the same day it ends up with end_date < start_date, which matches no
    // date at all: exactly the intent, and completions recorded against it stay put.
    const closeOn = toDbDate(addDaysToDateKey(draft.startDate, -1));
    await tx.readingPlan.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false, endDate: closeOn },
    });
    return toPlan(
      await tx.readingPlan.create({ data: planData(userId, draft) }),
    );
  });
}

/** Destructive: drops every plan and completion for this reader. */
export async function resetAllProgress(userId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    await lockReader(tx, userId);
    await tx.readingCompletion.deleteMany({ where: { userId } });
    await tx.readingPlan.deleteMany({ where: { userId } });
  });
}

// Completions (bibletrackerapp: completion-repository.ts)

/** Inclusive on both ends. Backs the calendar, which loads a month at a time. */
export async function getCompletionsForRange(
  userId: string,
  start: DateKey,
  end: DateKey,
): Promise<ReadingCompletion[]> {
  const rows = await db.readingCompletion.findMany({
    where: { userId, localDate: { gte: toDbDate(start), lte: toDbDate(end) } },
    orderBy: COMPLETION_ORDER,
  });
  return rows.map(toCompletion);
}

/** Streaks need the whole history, so this deliberately has no range. */
export async function getAllCompletions(
  userId: string,
): Promise<ReadingCompletion[]> {
  return (await findAllCompletions(db, userId)).map(toCompletion);
}

export async function getCompletionsForDate(
  userId: string,
  localDate: DateKey,
): Promise<ReadingCompletion[]> {
  const rows = await db.readingCompletion.findMany({
    where: { userId, localDate: toDbDate(localDate) },
    orderBy: COMPLETION_ORDER,
  });
  return rows.map(toCompletion);
}

export interface MarkCompleteInput {
  readonly readingPlanId: string;
  readonly localDate: DateKey;
  readonly chapters: readonly BibleReference[];
  /**
   * A partial span, applied only when a single chapter is being recorded: you read part
   * of one chapter, never part of several. Omit for whole-chapter reads.
   */
  readonly verses?: VerseRange;
  readonly completedAt?: number;
}

/**
 * Records a day's reading.
 *
 * One statement with ON CONFLICT DO NOTHING: a multi-chapter day is all-or-nothing, and
 * re-marking a day that is already complete is a no-op rather than a duplicate-key
 * failure. The plan must belong to this reader; the composite foreign key rejects a
 * plan id from anyone else.
 */
export async function markReadingComplete(
  userId: string,
  input: MarkCompleteInput,
): Promise<void> {
  const completedAt = new Date(input.completedAt ?? Date.now());
  const localDate = toDbDate(input.localDate);

  // A span only makes sense for a single chapter; ignore it otherwise rather than
  // silently applying the same verses to several chapters.
  const span = input.chapters.length === 1 ? input.verses : undefined;

  await db.readingCompletion.createMany({
    data: input.chapters.map((chapter) => ({
      userId,
      readingPlanId: input.readingPlanId,
      localDate,
      bookId: chapter.bookId,
      chapter: chapter.chapter,
      fromVerse: span?.from ?? 0,
      toVerse: span?.to ?? 0,
      completedAt,
    })),
    skipDuplicates: true,
  });
}

/** Undo: removes every chapter this reader recorded on that local day. */
export async function removeReadingCompletion(
  userId: string,
  localDate: DateKey,
): Promise<void> {
  await db.readingCompletion.deleteMany({
    where: { userId, localDate: toDbDate(localDate) },
  });
}

/**
 * Removes a single recorded reading.
 *
 * A day can hold several rows (a multi-chapter plan, or one chapter finished across two
 * sittings), and clearing the whole date to undo one mistaken entry would take the
 * correct ones with it. An id that is not a UUID matches nothing, as on iOS, instead of
 * failing the query.
 */
export async function removeCompletionById(
  userId: string,
  id: string,
): Promise<void> {
  if (!UUID_PATTERN.test(id)) return;
  await db.readingCompletion.deleteMany({ where: { id, userId } });
}

export async function countAllCompletions(userId: string): Promise<number> {
  return db.readingCompletion.count({ where: { userId } });
}

// Snapshot (bibletrackerapp: readSnapshot in reading-data-provider.tsx)

export interface ReadingSnapshot {
  /** Every plan segment, oldest first. */
  readonly plans: ReadingPlan[];
  /** The open-ended segment, or `null` before onboarding. */
  readonly activePlan: ReadingPlan | null;
  readonly completions: ReadingCompletion[];
}

/**
 * Everything the reading screens derive from, read as one consistent view.
 *
 * The iOS provider re-reads plans, the active plan and every completion after each
 * write. Reading them inside one repeatable-read transaction means a write from another
 * device cannot land between the reads and leave them disagreeing.
 */
export async function getReadingSnapshot(
  userId: string,
): Promise<ReadingSnapshot> {
  return db.$transaction(
    async (tx) => {
      const plans = await findAllPlans(tx, userId);
      const active = await findActivePlan(tx, userId);
      const completions = await findAllCompletions(tx, userId);
      return {
        plans: plans.map(toPlan),
        activePlan: active === null ? null : toPlan(active),
        completions: completions.map(toCompletion),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}

// Settings (bibletrackerapp: settings-repository.ts)

const SETTING_KEYS = {
  appearance: "appearance",
  timeZone: "time_zone",
} as const;

type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

async function readSetting(
  userId: string,
  key: SettingKey,
): Promise<string | null> {
  const row = await db.appSetting.findUnique({
    where: { userId_key: { userId, key } },
  });
  return row?.value ?? null;
}

async function writeSetting(
  userId: string,
  key: SettingKey,
  value: string,
): Promise<void> {
  await db.appSetting.upsert({
    where: { userId_key: { userId, key } },
    create: { userId, key, value },
    update: { value },
  });
}

/**
 * Every read is validated, so a value written by an older build (or corrupted) degrades
 * to the documented default instead of breaking a screen.
 */
export async function getAppearancePreference(
  userId: string,
): Promise<AppearancePreference> {
  const parsed = appearanceSchema.safeParse(
    await readSetting(userId, SETTING_KEYS.appearance),
  );
  return parsed.success ? parsed.data : DEFAULT_APPEARANCE;
}

export async function setAppearancePreference(
  userId: string,
  value: AppearancePreference,
): Promise<void> {
  await writeSetting(
    userId,
    SETTING_KEYS.appearance,
    appearanceSchema.parse(value),
  );
}

/**
 * The reader's IANA timezone, used to work out "today" on the server. `null` until the
 * browser has reported one, or when the stored value is not a zone this runtime knows.
 */
export async function getTimeZone(userId: string): Promise<string | null> {
  const stored = await readSetting(userId, SETTING_KEYS.timeZone);
  return stored !== null && isValidTimeZone(stored) ? stored : null;
}

/** @throws RangeError when `timeZone` is not a recognised IANA zone. */
export async function setTimeZone(
  userId: string,
  timeZone: string,
): Promise<void> {
  if (!isValidTimeZone(timeZone)) {
    throw new RangeError(`Unknown timezone: "${timeZone}"`);
  }
  await writeSetting(userId, SETTING_KEYS.timeZone, timeZone);
}

export async function clearAllSettings(userId: string): Promise<void> {
  await db.appSetting.deleteMany({ where: { userId } });
}
