import "server-only";

import { getCanonIndex } from "@/data/bible/canon-index";
import { resolvePlanForDate } from "@/features/reading-plan/domain/schedule";
import {
  createReadingPlan,
  getActiveReadingPlan,
  getAllReadingPlans,
  getReadingSnapshot,
  isForeignKeyViolation,
  isUniqueViolation,
  markReadingComplete,
  removeCompletionById,
  removeReadingCompletion,
  replaceActiveReadingPlan,
  resetAllProgress,
  setAppearancePreference,
  setReadingExtra,
  setTimeZone,
} from "@/lib/dal";
import { compareDateKeys } from "@/utils/date-key";
import { getTodayDateKeyInZone } from "@/utils/zoned-date-key";

import {
  changePlanInput,
  completeReadingInput,
  setAppearanceInput,
  setReadingExtraInput,
  startPlanInput,
  syncTimeZoneInput,
  undoReadingEntryInput,
  undoReadingInput,
} from "./inputs";
import type { ReadingErrorCode, ReadingResult, SettingResult } from "./results";

/**
 * The reading commands behind the Server Actions in src/actions/reading.ts.
 *
 * They take an already-authenticated `userId` so they can be tested without a request.
 * Each mirrors a function of bibletrackerapp's ReadingDataProvider: write, then return
 * the whole snapshot. Input is parsed again here because an action is a public endpoint.
 */

function fail(error: ReadingErrorCode): { ok: false; error: ReadingErrorCode } {
  return { ok: false, error };
}

async function withSnapshot(userId: string): Promise<ReadingResult> {
  return { ok: true, snapshot: await getReadingSnapshot(userId) };
}

/** Onboarding. The presence of an active plan is the "onboarded" marker. */
export async function startPlanFor(
  userId: string,
  raw: unknown,
): Promise<ReadingResult> {
  const input = startPlanInput.safeParse(raw);
  if (!input.success) return fail("invalid-input");
  if ((await getActiveReadingPlan(userId)) !== null)
    return fail("already-started");

  try {
    await createReadingPlan(userId, input.data.draft);
  } catch (error) {
    // A double submit lost the race; the first one already started the plan.
    if (isUniqueViolation(error)) return fail("already-started");
    throw error;
  }
  return withSnapshot(userId);
}

/**
 * Moves the reading position: closes the open segment and starts a new one.
 *
 * On iOS the new segment always starts today (reading-plan screen) or later (a
 * continuation skips days already recorded), so earlier starts are refused: they
 * would rewrite which plan governed days that have passed.
 */
export async function changePlanFor(
  userId: string,
  raw: unknown,
): Promise<ReadingResult> {
  const input = changePlanInput.safeParse(raw);
  if (!input.success) return fail("invalid-input");
  const { draft, timeZone } = input.data;

  const today = getTodayDateKeyInZone(timeZone);
  if (compareDateKeys(draft.startDate, today) < 0) return fail("start-in-past");
  // Checked by the DAL under the reader's lock, not here: a reset on another device
  // could otherwise commit between the check and the write, and the change would bring
  // a plan back.
  if ((await replaceActiveReadingPlan(userId, draft)) === null) {
    return fail("no-plan");
  }
  return withSnapshot(userId);
}

/**
 * Records a reading against a day.
 *
 * As on iOS, the row belongs to the plan segment governing that date, or the active plan
 * for a day no segment covers (before the plan began). With no plan at all it fails
 * rather than claiming a success that was never stored.
 */
export async function completeReadingFor(
  userId: string,
  raw: unknown,
): Promise<ReadingResult> {
  const input = completeReadingInput.safeParse(raw);
  if (!input.success) return fail("invalid-input");
  const { date, chapters, verses, ids, isExtra, timeZone } = input.data;

  if (compareDateKeys(date, getTodayDateKeyInZone(timeZone)) > 0) {
    return fail("future-date");
  }

  const plan =
    resolvePlanForDate(await getAllReadingPlans(userId), date) ??
    (await getActiveReadingPlan(userId));
  if (plan === null) return fail("no-plan");

  const index = getCanonIndex(plan.canonId);
  if (!chapters.every((reference) => index.isValidReference(reference))) {
    return fail("unknown-chapter");
  }
  // The span only applies to a single chapter (the DAL ignores it otherwise).
  const only = chapters.length === 1 ? chapters[0] : undefined;
  if (verses !== undefined && only !== undefined) {
    const verseCount = index.getVerseCount(only) ?? 0;
    if (verses.to > verseCount) return fail("verses-out-of-range");
  }

  try {
    await markReadingComplete(userId, {
      readingPlanId: plan.id,
      localDate: date,
      chapters,
      verses,
      ids,
      isExtra,
    });
  } catch (error) {
    // Another device reset progress after the plan was looked up, so the plan is gone.
    if (isForeignKeyViolation(error)) return fail("no-plan");
    throw error;
  }
  return withSnapshot(userId);
}

/** Undo: removes every plan reading recorded on that day (extras stay). */
export async function undoReadingFor(
  userId: string,
  raw: unknown,
): Promise<ReadingResult> {
  const input = undoReadingInput.safeParse(raw);
  if (!input.success) return fail("invalid-input");
  await removeReadingCompletion(userId, input.data.date);
  return withSnapshot(userId);
}

/** Removes one recorded reading, leaving the rest of that day intact. */
export async function undoReadingEntryFor(
  userId: string,
  raw: unknown,
): Promise<ReadingResult> {
  const input = undoReadingEntryInput.safeParse(raw);
  if (!input.success) return fail("invalid-input");
  await removeCompletionById(userId, input.data.id);
  return withSnapshot(userId);
}

/** Moves one recorded reading into or out of the plan (web only, bibletrackerweb#18). */
export async function setReadingExtraFor(
  userId: string,
  raw: unknown,
): Promise<ReadingResult> {
  const input = setReadingExtraInput.safeParse(raw);
  if (!input.success) return fail("invalid-input");
  await setReadingExtra(userId, input.data.id, input.data.isExtra);
  return withSnapshot(userId);
}

/** Destructive: drops every plan and completion. Settings are kept, as on iOS. */
export async function resetProgressFor(userId: string): Promise<ReadingResult> {
  await resetAllProgress(userId);
  return withSnapshot(userId);
}

export async function syncTimeZoneFor(
  userId: string,
  raw: unknown,
): Promise<SettingResult> {
  const input = syncTimeZoneInput.safeParse(raw);
  if (!input.success) return fail("invalid-input");
  await setTimeZone(userId, input.data.timeZone);
  return { ok: true };
}

export async function setAppearanceFor(
  userId: string,
  raw: unknown,
): Promise<SettingResult> {
  const input = setAppearanceInput.safeParse(raw);
  if (!input.success) return fail("invalid-input");
  await setAppearancePreference(userId, input.data.appearance);
  return { ok: true };
}
