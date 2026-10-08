// Web-only (bibletrackerweb#18): read-throughs in the DAL and commands. The iOS ports
// (reading-plans.db.test.ts, commands.db.test.ts) are left as they are.
import { beforeEach, describe, expect, it } from "vitest";

import {
  completeReadingFor,
  resetProgressFor,
  setReadingExtraFor,
  startNextReadThroughFor,
  startPlanFor,
} from "@/features/reading-plan/commands/commands";
import type { ReadingResult } from "@/features/reading-plan/commands/results";
import { isCurrentReadThroughFinished } from "@/features/reading-plan/domain/read-through";
import {
  createReadingPlan,
  getActiveReadingPlan,
  getAllReadingPlans,
  type ReadingSnapshot,
  startNextReadThrough,
} from "@/lib/dal";
import { createTestUser, makeDraft, replacePlan } from "@/test/factories";
import { createId } from "@/utils/id";
import { getTodayDateKeyInZone } from "@/utils/zoned-date-key";

const TZ = "Asia/Manila";
const today = () => getTodayDateKeyInZone(TZ);

let user: string;

beforeEach(async () => {
  user = await createTestUser();
});

/** The command's finish check, asked of the stored readings. */
const isFinished = (stored: ReadingSnapshot) =>
  isCurrentReadThroughFinished(
    stored.plans,
    stored.activePlan,
    stored.completions,
  );

/** Skips the finish check, for tests about the segments themselves. */
const unchecked = () => true;

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
    await startNextReadThrough(
      user,
      makeDraft({ startDate: "2026-08-01" }),
      unchecked,
    );

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
      unchecked,
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
    await finishTheBible();
    const draft = makeDraft({ startDate: "2026-08-01" });

    const [a, b] = await Promise.all([
      startNextReadThrough(user, draft, isFinished),
      startNextReadThrough(user, draft, isFinished),
    ]);

    expect([a, b].filter((plan) => plan !== null)).toHaveLength(1);
    expect((await getActiveReadingPlan(user))?.readThrough).toBe(2);
  });

  it("refuses when a position change un-finished the read-through first", async () => {
    await finishTheBible();
    // This device saw it finished; another then moved back to Genesis 1.
    await replacePlan(user, makeDraft({ startDate: "2026-01-02" }));

    expect(
      await startNextReadThrough(
        user,
        makeDraft({ startDate: "2026-08-01" }),
        isFinished,
      ),
    ).toBeNull();
    expect((await getActiveReadingPlan(user))?.readThrough).toBe(1);
  });

  it("refuses without an open plan", async () => {
    expect(await startNextReadThrough(user, makeDraft(), unchecked)).toBeNull();
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

describe("an extra joining the plan after a new read-through began", () => {
  /**
   * Genesis 1 re-read today after finishing the Bible (so logged as an extra), then
   * read-through 2 started the same day. Returns the extra's id.
   */
  async function rereadThenStartNext(): Promise<string> {
    await finishTheBible();
    const id = createId();
    snapshotOf(
      await completeReadingFor(user, {
        date: today(),
        chapters: [{ bookId: "GEN", chapter: 1 }],
        ids: [id],
        isExtra: true,
        timeZone: TZ,
      }),
    );
    snapshotOf(await startNextReadThroughFor(user, { timeZone: TZ }));
    return id;
  }

  /** The entry's extra flag and the read-through of its segment. */
  function placeOf(result: ReadingResult, id: string) {
    const { plans, completions } = snapshotOf(result);
    const entry = completions.find((completion) => completion.id === id);
    const plan = plans.find((each) => each.id === entry?.readingPlanId);
    return { isExtra: entry?.isExtra, readThrough: plan?.readThrough };
  }

  it("counts toward the new read-through once marked read in it", async () => {
    const id = await rereadThenStartNext();

    const result = await completeReadingFor(user, {
      date: today(),
      chapters: [{ bookId: "GEN", chapter: 1 }],
      timeZone: TZ,
    });

    expect(placeOf(result, id)).toEqual({ isExtra: false, readThrough: 2 });
  });

  it("counts toward the new read-through once counted toward the plan", async () => {
    const id = await rereadThenStartNext();

    const result = await setReadingExtraFor(user, { id, isExtra: false });

    expect(placeOf(result, id)).toEqual({ isExtra: false, readThrough: 2 });
  });

  it("keeps its segment when moved out of the plan", async () => {
    await finishTheBible();
    const [entry] = snapshotOf(
      await startNextReadThroughFor(user, { timeZone: TZ }),
    ).completions;
    if (entry === undefined) throw new Error("Expected Revelation 22");

    const result = await setReadingExtraFor(user, {
      id: entry.id,
      isExtra: true,
    });

    expect(placeOf(result, entry.id)).toEqual({
      isExtra: true,
      readThrough: 1,
    });
  });
});
