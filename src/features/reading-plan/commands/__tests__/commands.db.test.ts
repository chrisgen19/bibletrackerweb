import { beforeEach, describe, expect, it } from "vitest";

import { getTimeZone } from "@/lib/dal";
import { createTestUser, makeDraft } from "@/test/factories";
import { createId } from "@/utils/id";
import { getTodayDateKeyInZone } from "@/utils/zoned-date-key";

import {
  changePlanFor,
  completeReadingFor,
  resetProgressFor,
  startPlanFor,
  syncTimeZoneFor,
  undoReadingEntryFor,
  undoReadingFor,
} from "../commands";
import type { ReadingResult } from "../results";

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

describe("startPlanFor", () => {
  it("creates the first plan and returns the snapshot", async () => {
    const snapshot = snapshotOf(
      await startPlanFor(user, { draft: makeDraft() }),
    );
    expect(snapshot.activePlan).toMatchObject({
      startBookId: "GEN",
      startChapter: 1,
    });
    expect(snapshot.plans).toHaveLength(1);
  });

  it("refuses a second onboarding", async () => {
    await startPlanFor(user, { draft: makeDraft() });
    expect(await startPlanFor(user, { draft: makeDraft() })).toEqual({
      ok: false,
      error: "already-started",
    });
  });

  it("refuses a plan that starts on a chapter the book does not have", async () => {
    const result = await startPlanFor(user, {
      draft: makeDraft({ startBookId: "GEN", startChapter: 51 }),
    });
    expect(result).toEqual({ ok: false, error: "invalid-input" });
  });
});

describe("changePlanFor", () => {
  it("closes the open segment and starts a new one from today", async () => {
    await startPlanFor(user, { draft: makeDraft({ startDate: "2026-01-01" }) });
    const snapshot = snapshotOf(
      await changePlanFor(user, {
        draft: makeDraft({ startDate: today(), startBookId: "MAT" }),
        timeZone: TZ,
      }),
    );
    expect(snapshot.plans).toHaveLength(2);
    expect(snapshot.activePlan).toMatchObject({
      startBookId: "MAT",
      startDate: today(),
    });
  });

  it("refuses a new segment that starts in the past", async () => {
    await startPlanFor(user, { draft: makeDraft({ startDate: "2026-01-01" }) });
    expect(
      await changePlanFor(user, {
        draft: makeDraft({ startDate: "2026-01-02" }),
        timeZone: TZ,
      }),
    ).toEqual({ ok: false, error: "start-in-past" });
  });

  it("needs an existing plan", async () => {
    expect(
      await changePlanFor(user, {
        draft: makeDraft({ startDate: today() }),
        timeZone: TZ,
      }),
    ).toEqual({ ok: false, error: "no-plan" });
  });
});

describe("completeReadingFor", () => {
  beforeEach(async () => {
    await startPlanFor(user, { draft: makeDraft({ startDate: "2026-01-01" }) });
  });

  function complete(input: Record<string, unknown>) {
    return completeReadingFor(user, { timeZone: TZ, ...input });
  }

  it("records today's reading against the plan", async () => {
    const snapshot = snapshotOf(
      await complete({
        date: today(),
        chapters: [{ bookId: "GEN", chapter: 1 }],
      }),
    );
    expect(snapshot.completions).toEqual([
      expect.objectContaining({
        localDate: today(),
        bookId: "GEN",
        chapter: 1,
        verses: null,
      }),
    ]);
  });

  it("refuses a future day, judged in the reader's own timezone", async () => {
    // 10 PM on Aug 1 in Los Angeles is already Aug 2 in Manila.
    const instant = new Date("2026-08-02T05:00:00Z");
    expect(getTodayDateKeyInZone("America/Los_Angeles", instant)).toBe(
      "2026-08-01",
    );
    expect(getTodayDateKeyInZone(TZ, instant)).toBe("2026-08-02");

    const tomorrow = getTodayDateKeyInZone(
      TZ,
      new Date(Date.now() + 36 * 3600 * 1000),
    );
    expect(
      await complete({
        date: tomorrow,
        chapters: [{ bookId: "GEN", chapter: 1 }],
      }),
    ).toEqual({ ok: false, error: "future-date" });
  });

  it("stores the ids the client chose, so an optimistic row can be undone at once", async () => {
    const ids = [createId(), createId()];
    const snapshot = snapshotOf(
      await complete({
        date: today(),
        chapters: [
          { bookId: "GEN", chapter: 1 },
          { bookId: "GEN", chapter: 2 },
        ],
        ids,
      }),
    );
    expect(snapshot.completions.map((row) => row.id)).toEqual(ids);

    const [first] = ids;
    const after = snapshotOf(await undoReadingEntryFor(user, { id: first }));
    expect(after.completions.map((row) => row.id)).toEqual([ids[1]]);
  });

  it("attaches a past day to the segment that governed it", async () => {
    // Old plan from Jan 1; position moved today. A catch-up on Jan 10 belongs to the old one.
    const old = snapshotOf(
      await changePlanFor(user, {
        draft: makeDraft({ startDate: today(), startBookId: "MAT" }),
        timeZone: TZ,
      }),
    ).plans[0];
    const snapshot = snapshotOf(
      await complete({
        date: "2026-01-10",
        chapters: [{ bookId: "GEN", chapter: 5 }],
      }),
    );
    expect(snapshot.completions[0]?.readingPlanId).toBe(old?.id);
  });

  it("attaches a day before any plan to the active plan, as on iOS", async () => {
    const snapshot = snapshotOf(
      await complete({
        date: "2025-12-20",
        chapters: [{ bookId: "GEN", chapter: 1 }],
      }),
    );
    expect(snapshot.completions[0]?.readingPlanId).toBe(
      snapshot.activePlan?.id,
    );
  });

  it("records a verse span for a single chapter", async () => {
    const snapshot = snapshotOf(
      await complete({
        date: today(),
        chapters: [{ bookId: "GEN", chapter: 1 }],
        verses: { from: 1, to: 10 },
      }),
    );
    expect(snapshot.completions[0]?.verses).toEqual({ from: 1, to: 10 });
  });

  it.each([
    [{ chapters: [{ bookId: "XYZ", chapter: 1 }] }, "unknown-chapter"],
    [{ chapters: [{ bookId: "GEN", chapter: 51 }] }, "unknown-chapter"],
    [
      {
        chapters: [{ bookId: "GEN", chapter: 1 }],
        verses: { from: 1, to: 32 },
      },
      "verses-out-of-range",
    ],
    [
      {
        chapters: [{ bookId: "GEN", chapter: 1 }],
        verses: { from: 10, to: 5 },
      },
      "invalid-input",
    ],
    [{ chapters: [] }, "invalid-input"],
    [
      { chapters: [{ bookId: "GEN", chapter: 1 }], ids: ["not-a-uuid"] },
      "invalid-input",
    ],
  ])("refuses %j with %s", async (input, error) => {
    expect(await complete({ date: today(), ...input })).toEqual({
      ok: false,
      error,
    });
  });

  it("refuses everything for a reader with no plan", async () => {
    const newcomer = await createTestUser();
    expect(
      await completeReadingFor(newcomer, {
        date: today(),
        chapters: [{ bookId: "GEN", chapter: 1 }],
        timeZone: TZ,
      }),
    ).toEqual({ ok: false, error: "no-plan" });
  });
});

describe("undo and reset", () => {
  it("removes a whole day, then everything", async () => {
    await startPlanFor(user, { draft: makeDraft({ startDate: "2026-01-01" }) });
    await completeReadingFor(user, {
      date: "2026-01-02",
      chapters: [{ bookId: "GEN", chapter: 1 }],
      timeZone: TZ,
    });

    const afterUndo = snapshotOf(
      await undoReadingFor(user, { date: "2026-01-02" }),
    );
    expect(afterUndo.completions).toEqual([]);

    const afterReset = snapshotOf(await resetProgressFor(user));
    expect(afterReset).toEqual({
      plans: [],
      activePlan: null,
      completions: [],
    });
  });

  it("rejects malformed input instead of throwing", async () => {
    expect(await undoReadingFor(user, { date: "yesterday" })).toEqual({
      ok: false,
      error: "invalid-input",
    });
    expect(await startPlanFor(user, null)).toEqual({
      ok: false,
      error: "invalid-input",
    });
  });
});

describe("syncTimeZoneFor", () => {
  it("stores a real zone and refuses an unknown one", async () => {
    expect(await syncTimeZoneFor(user, { timeZone: "Asia/Manila" })).toEqual({
      ok: true,
    });
    expect(await getTimeZone(user)).toBe("Asia/Manila");
    expect(await syncTimeZoneFor(user, { timeZone: "Mars/Base" })).toEqual({
      ok: false,
      error: "invalid-input",
    });
  });
});
