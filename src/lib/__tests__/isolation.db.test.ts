// New for the web: on iOS the database belonged to one reader. Here every DAL function
// must see and change only the calling reader's rows.
import { beforeEach, describe, expect, it } from "vitest";

import type { ReadingPlan } from "@/features/reading-plan/domain/types";
import {
  countAllCompletions,
  createReadingPlan,
  getActiveReadingPlan,
  getAllCompletions,
  getAllReadingPlans,
  getAppearancePreference,
  getCompletionsForDate,
  getReadingSnapshot,
  markReadingComplete,
  removeCompletionById,
  removeReadingCompletion,
  replaceActiveReadingPlan,
  resetAllProgress,
  setAppearancePreference,
} from "@/lib/dal";
import { createTestUser, makeDraft } from "@/test/factories";

let alice: string;
let bob: string;
let alicePlan: ReadingPlan;

beforeEach(async () => {
  alice = await createTestUser();
  bob = await createTestUser();
  alicePlan = await createReadingPlan(alice, makeDraft());
  await markReadingComplete(alice, {
    readingPlanId: alicePlan.id,
    localDate: "2026-08-01",
    chapters: [{ bookId: "GEN", chapter: 1 }],
  });
});

describe("one reader cannot see another's data", () => {
  it("returns nothing for a reader with no rows of their own", async () => {
    expect(await getActiveReadingPlan(bob)).toBeNull();
    expect(await getAllReadingPlans(bob)).toEqual([]);
    expect(await getAllCompletions(bob)).toEqual([]);
    expect(await getCompletionsForDate(bob, "2026-08-01")).toEqual([]);
    expect(await countAllCompletions(bob)).toBe(0);
    expect(await getReadingSnapshot(bob)).toEqual({
      plans: [],
      activePlan: null,
      completions: [],
    });
  });

  it("keeps settings per reader", async () => {
    await setAppearancePreference(alice, "dark");
    expect(await getAppearancePreference(bob)).toBe("system");
  });
});

describe("one reader cannot change another's data", () => {
  it("cannot remove another reader's completion by id", async () => {
    const [row] = await getAllCompletions(alice);
    await removeCompletionById(bob, row?.id ?? "");
    expect(await countAllCompletions(alice)).toBe(1);
  });

  it("cannot clear another reader's day", async () => {
    await removeReadingCompletion(bob, "2026-08-01");
    expect(await countAllCompletions(alice)).toBe(1);
  });

  it("cannot reset another reader's progress", async () => {
    await resetAllProgress(bob);
    expect(await getAllReadingPlans(alice)).toHaveLength(1);
    expect(await countAllCompletions(alice)).toBe(1);
  });

  it("does not close another reader's plan when changing position", async () => {
    await createReadingPlan(bob, makeDraft());
    await replaceActiveReadingPlan(bob, makeDraft({ startDate: "2026-08-09" }));
    expect((await getActiveReadingPlan(alice))?.id).toBe(alicePlan.id);
  });

  it("cannot record a reading against another reader's plan", async () => {
    // The composite foreign key (reading_plan_id, user_id) rejects it outright.
    await expect(
      markReadingComplete(bob, {
        readingPlanId: alicePlan.id,
        localDate: "2026-08-02",
        chapters: [{ bookId: "GEN", chapter: 2 }],
      }),
    ).rejects.toThrow();
    expect(await countAllCompletions(bob)).toBe(0);
    expect(await countAllCompletions(alice)).toBe(1);
  });
});
