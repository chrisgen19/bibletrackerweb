// Ported from bibletrackerapp src/features/progress/data/__tests__/
// completion-repository.test.ts. Same cases and names, plus the ordering guarantee that
// SQLite gave implicitly.
import { beforeEach, describe, expect, it } from "vitest";

import type { ReadingPlan } from "@/features/reading-plan/domain/types";
import {
  countAllCompletions,
  createReadingPlan,
  getAllCompletions,
  getCompletionsForDate,
  getCompletionsForRange,
  markReadingComplete,
  removeCompletionById,
  removeReadingCompletion,
} from "@/lib/dal";
import { createTestUser, makeDraft } from "@/test/factories";

let user: string;
let plan: ReadingPlan;

beforeEach(async () => {
  user = await createTestUser();
  plan = await createReadingPlan(user, makeDraft());
});

function complete(localDate: string, chapter: number, bookId = "GEN") {
  return markReadingComplete(user, {
    readingPlanId: plan.id,
    localDate,
    chapters: [{ bookId, chapter }],
    completedAt: 1_000,
  });
}

describe("markReadingComplete", () => {
  it("records the chapter against the day", async () => {
    await complete("2026-08-01", 13);

    expect(await getCompletionsForDate(user, "2026-08-01")).toEqual([
      expect.objectContaining({
        localDate: "2026-08-01",
        bookId: "GEN",
        chapter: 13,
      }),
    ]);
  });

  it("is idempotent - marking the same day twice does not duplicate", async () => {
    await complete("2026-08-01", 13);
    await complete("2026-08-01", 13);

    expect(await countAllCompletions(user)).toBe(1);
  });

  it("writes one row per chapter for a multi-chapter day", async () => {
    await markReadingComplete(user, {
      readingPlanId: plan.id,
      localDate: "2026-08-01",
      chapters: [
        { bookId: "GEN", chapter: 13 },
        { bookId: "GEN", chapter: 14 },
      ],
    });

    expect(await getCompletionsForDate(user, "2026-08-01")).toHaveLength(2);
  });

  it("allows the same chapter on a different day", async () => {
    // Re-reading a chapter later is legitimate; the unique index is per day.
    await complete("2026-08-01", 13);
    await complete("2026-08-02", 13);

    expect(await countAllCompletions(user)).toBe(2);
  });

  it("snapshots the chapter rather than deriving it later", async () => {
    // A day logged as John 3 must stay John 3 whatever the plan says afterwards.
    await complete("2026-08-01", 3, "JHN");

    expect((await getCompletionsForDate(user, "2026-08-01"))[0]).toMatchObject({
      bookId: "JHN",
      chapter: 3,
    });
  });

  it("round-trips a verse span, the whole-chapter sentinel and the timestamp", async () => {
    await markReadingComplete(user, {
      readingPlanId: plan.id,
      localDate: "2026-08-01",
      chapters: [{ bookId: "GEN", chapter: 1 }],
      verses: { from: 1, to: 10 },
      completedAt: 1_754_000_000_123,
    });
    await complete("2026-08-02", 2);

    const [span, whole] = await getAllCompletions(user);
    expect(span).toMatchObject({
      verses: { from: 1, to: 10 },
      completedAt: 1_754_000_000_123,
    });
    expect(whole).toMatchObject({ verses: null, completedAt: 1_000 });
  });

  it("ignores a verse span when several chapters are recorded at once", async () => {
    await markReadingComplete(user, {
      readingPlanId: plan.id,
      localDate: "2026-08-01",
      chapters: [
        { bookId: "GEN", chapter: 13 },
        { bookId: "GEN", chapter: 14 },
      ],
      verses: { from: 1, to: 5 },
    });

    const rows = await getCompletionsForDate(user, "2026-08-01");
    expect(rows.map((row) => row.verses)).toEqual([null, null]);
  });
});

describe("getCompletionsForRange", () => {
  beforeEach(async () => {
    await complete("2026-07-31", 12);
    await complete("2026-08-01", 13);
    await complete("2026-08-15", 27);
    await complete("2026-09-01", 44);
  });

  it("is inclusive of both ends", async () => {
    const rows = await getCompletionsForRange(user, "2026-08-01", "2026-08-15");
    expect(rows.map((r) => r.localDate)).toEqual(["2026-08-01", "2026-08-15"]);
  });

  it("excludes days outside the range", async () => {
    const rows = await getCompletionsForRange(user, "2026-08-01", "2026-08-31");
    expect(rows.map((r) => r.localDate)).not.toContain("2026-07-31");
    expect(rows.map((r) => r.localDate)).not.toContain("2026-09-01");
  });

  it("returns them in date order", async () => {
    const rows = await getCompletionsForRange(user, "2026-07-01", "2026-12-31");
    expect(rows.map((r) => r.localDate)).toEqual([
      "2026-07-31",
      "2026-08-01",
      "2026-08-15",
      "2026-09-01",
    ]);
  });

  it("returns nothing for an empty range", async () => {
    expect(
      await getCompletionsForRange(user, "2027-01-01", "2027-01-31"),
    ).toEqual([]);
  });
});

describe("same-day ordering", () => {
  it("keeps the order chapters were recorded in, as SQLite's rowid did", async () => {
    // A multi-chapter day must come back 13, 14, 15 so it formats as "Genesis 13-15".
    await markReadingComplete(user, {
      readingPlanId: plan.id,
      localDate: "2026-08-01",
      chapters: [13, 14, 15].map((chapter) => ({ bookId: "GEN", chapter })),
    });
    await complete("2026-08-01", 2, "EXO");

    const rows = await getCompletionsForDate(user, "2026-08-01");
    expect(rows.map((r) => `${r.bookId} ${r.chapter}`)).toEqual([
      "GEN 13",
      "GEN 14",
      "GEN 15",
      "EXO 2",
    ]);
  });
});

describe("removeReadingCompletion", () => {
  it("removes every chapter recorded on that day", async () => {
    await markReadingComplete(user, {
      readingPlanId: plan.id,
      localDate: "2026-08-01",
      chapters: [
        { bookId: "GEN", chapter: 13 },
        { bookId: "GEN", chapter: 14 },
      ],
    });
    await complete("2026-08-02", 15);

    await removeReadingCompletion(user, "2026-08-01");

    expect(await getCompletionsForDate(user, "2026-08-01")).toEqual([]);
    // Neighbouring days are untouched.
    expect(await getCompletionsForDate(user, "2026-08-02")).toHaveLength(1);
  });

  it("is safe on a day with nothing recorded", async () => {
    await expect(
      removeReadingCompletion(user, "2026-08-01"),
    ).resolves.toBeUndefined();
    expect(await countAllCompletions(user)).toBe(0);
  });

  it("lets the day be marked again afterwards", async () => {
    await complete("2026-08-01", 13);
    await removeReadingCompletion(user, "2026-08-01");
    await complete("2026-08-01", 13);

    expect(await getAllCompletions(user)).toHaveLength(1);
  });
});

describe("removeCompletionById", () => {
  it("removes one reading and leaves the rest of the day alone", async () => {
    // The case that matters: a day holding a mistaken entry beside a correct one.
    // Clearing the whole date to undo the mistake would take the good row with it.
    await complete("2026-08-30", 1, "GEN");
    await complete("2026-08-30", 6, "LEV");

    const rows = await getCompletionsForDate(user, "2026-08-30");
    const wrong = rows.find((row) => row.bookId === "GEN");
    expect(wrong).toBeDefined();

    await removeCompletionById(user, wrong?.id ?? "");

    expect(await getCompletionsForDate(user, "2026-08-30")).toEqual([
      expect.objectContaining({ bookId: "LEV", chapter: 6 }),
    ]);
  });

  it("is a no-op for an id that is not there", async () => {
    await complete("2026-08-30", 6, "LEV");
    // Not even a UUID: Postgres would reject it in a uuid comparison, iOS just matched
    // nothing. The DAL keeps the iOS behaviour.
    await removeCompletionById(user, "nope");
    await removeCompletionById(user, "00000000-0000-4000-8000-000000000000");
    expect(await countAllCompletions(user)).toBe(1);
  });
});
