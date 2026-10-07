// Web-only (bibletrackerweb#18): read-throughs in the DAL and commands. The iOS ports
// (reading-plans.db.test.ts, commands.db.test.ts) are left as they are.
import { beforeEach, describe, expect, it } from "vitest";

import {
  completeReadingFor,
  resetProgressFor,
  startNextReadThroughFor,
  startPlanFor,
} from "@/features/reading-plan/commands/commands";
import type { ReadingResult } from "@/features/reading-plan/commands/results";
import {
  createReadingPlan,
  getActiveReadingPlan,
  getAllReadingPlans,
  startNextReadThrough,
} from "@/lib/dal";
import { createTestUser, makeDraft, replacePlan } from "@/test/factories";
import { getTodayDateKeyInZone } from "@/utils/zoned-date-key";

const TZ = "Asia/Manila";
const today = () => getTodayDateKeyInZone(TZ);

let user: string;

beforeEach(async () => {
  user = await createTestUser();
});

function snapshotOf(result: ReadingResult) {
  if (!result.ok) throw new Error(`Expected success, got ${result.error}`);
  return result.snapshot;
}

/** A reader whose plan began at Revelation 22, so reading one chapter finishes it. */
async function finishTheBible() {
  snapshotOf(
    await startPlanFor(user, {
      draft: makeDraft({
        startDate: "2026-01-01",
        startBookId: "REV",
        startChapter: 22,
      }),
    }),
  );
  snapshotOf(
    await completeReadingFor(user, {
      date: "2026-01-01",
      chapters: [{ bookId: "REV", chapter: 22 }],
      timeZone: TZ,
    }),
  );
}

describe("read-throughs in the DAL", () => {
  it("starts a new reader on the first read-through", async () => {
    const plan = await createReadingPlan(user, makeDraft());
    expect(plan.readThrough).toBe(1);
  });

  it("keeps the read-through when the position changes", async () => {
    const plan = await createReadingPlan(user, makeDraft());
    await startNextReadThrough(user, makeDraft({ startDate: "2026-08-01" }), 1);

    const moved = await replacePlan(
      user,
      makeDraft({ startDate: "2026-09-01", startBookId: "MAT" }),
    );

    expect(plan.readThrough).toBe(1);
    expect(moved.readThrough).toBe(2);
  });

  it("starts the next read-through one on, closing the current segment", async () => {
    await createReadingPlan(user, makeDraft({ startDate: "2026-07-20" }));

    const next = await startNextReadThrough(
      user,
      makeDraft({ startDate: "2026-08-01" }),
      1,
    );

    expect(next).toEqual(
      expect.objectContaining({ readThrough: 2, isActive: true }),
    );
    const plans = await getAllReadingPlans(user);
    expect(plans.map((plan) => [plan.readThrough, plan.endDate])).toEqual([
      [1, "2026-07-31"],
      [2, null],
    ]);
  });

  it("starts one read-through when two devices finish at once", async () => {
    await createReadingPlan(user, makeDraft());
    const draft = makeDraft({ startDate: "2026-08-01" });

    const [a, b] = await Promise.all([
      startNextReadThrough(user, draft, 1),
      startNextReadThrough(user, draft, 1),
    ]);

    expect([a, b].filter((plan) => plan !== null)).toHaveLength(1);
    expect((await getActiveReadingPlan(user))?.readThrough).toBe(2);
  });

  it("refuses without an open plan", async () => {
    expect(await startNextReadThrough(user, makeDraft(), 1)).toBeNull();
  });
});

describe("startNextReadThroughFor", () => {
  it("refuses until the Bible is finished", async () => {
    snapshotOf(await startPlanFor(user, { draft: makeDraft() }));
    expect(await startNextReadThroughFor(user, { timeZone: TZ })).toEqual({
      ok: false,
      error: "not-finished",
    });
  });

  it("starts read-through 2 at Genesis 1 today, keeping the history", async () => {
    await finishTheBible();

    const snapshot = snapshotOf(
      await startNextReadThroughFor(user, { timeZone: TZ }),
    );

    expect(snapshot.activePlan).toEqual(
      expect.objectContaining({
        readThrough: 2,
        startDate: today(),
        startBookId: "GEN",
        startChapter: 1,
      }),
    );
    expect(snapshot.completions).toHaveLength(1);
  });

  it("refuses a second start once read-through 2 is under way", async () => {
    await finishTheBible();
    snapshotOf(await startNextReadThroughFor(user, { timeZone: TZ }));

    expect(await startNextReadThroughFor(user, { timeZone: TZ })).toEqual({
      ok: false,
      error: "not-finished",
    });
  });

  it("refuses malformed input and a reader without a plan", async () => {
    expect(await startNextReadThroughFor(user, {})).toEqual({
      ok: false,
      error: "invalid-input",
    });
    expect(await startNextReadThroughFor(user, { timeZone: TZ })).toEqual({
      ok: false,
      error: "no-plan",
    });
  });

  it("begins again at 1 after a reset", async () => {
    await finishTheBible();
    snapshotOf(await startNextReadThroughFor(user, { timeZone: TZ }));
    await resetProgressFor(user);

    const snapshot = snapshotOf(
      await startPlanFor(user, { draft: makeDraft() }),
    );
    expect(snapshot.activePlan?.readThrough).toBe(1);
  });
});
