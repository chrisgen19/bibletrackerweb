import { PROTESTANT_CANON_INDEX } from "@/data/bible/canon-index";
import { makeCompletion } from "@/features/reading-plan/domain/__tests__/fixtures";
import { createCompletionLookup } from "@/features/reading-plan/domain/schedule";
import type { ReadingCompletion } from "@/features/reading-plan/domain/types";

import { buildHeatmap, heatLevel, summarizeDay } from "../reading-heatmap";

const index = PROTESTANT_CANON_INDEX;

function inputFor(
  rows: readonly ReadingCompletion[],
  today: string,
  weekCount: number,
) {
  return {
    today,
    planStart: "2026-10-01",
    rowsOn: createCompletionLookup(rows).get,
    index,
    weekCount,
  };
}

describe("summarizeDay", () => {
  it("returns null for a day with nothing recorded", () => {
    expect(summarizeDay(undefined, index)).toBeNull();
  });

  it("separates plan readings from extras and counts both", () => {
    const summary = summarizeDay(
      [
        makeCompletion("2026-10-20", { bookId: "GEN", chapter: 24 }),
        makeCompletion("2026-10-20", {
          id: "extra",
          bookId: "PSA",
          chapter: 23,
          isExtra: true,
        }),
      ],
      index,
    );
    expect(summary).toEqual({
      passage: "Genesis 24",
      extra: "Psalms 23",
      chapters: 2,
    });
  });

  it("names the verses when only part of a chapter was read", () => {
    const summary = summarizeDay(
      [
        makeCompletion("2026-10-20", {
          bookId: "GEN",
          chapter: 24,
          verses: { from: 1, to: 1 },
        }),
      ],
      index,
    );
    expect(summary?.passage).toBe("Genesis 24:1");
  });
});

describe("heatLevel", () => {
  it("caps at three chapters", () => {
    expect([0, 1, 2, 3, 7].map(heatLevel)).toEqual([0, 1, 2, 3, 3]);
  });
});

describe("buildHeatmap", () => {
  // Thursday 29 October 2026.
  const today = "2026-10-29";
  const rows = [
    makeCompletion("2026-10-28", { bookId: "GEN", chapter: 3 }),
    makeCompletion("2026-10-28", { id: "b", bookId: "GEN", chapter: 4 }),
  ];
  const heatmap = buildHeatmap(inputFor(rows, today, 4));
  const cells = heatmap.weeks.flat();

  it("ends with the Sunday-first week that holds today", () => {
    expect(heatmap.weeks).toHaveLength(4);
    expect(heatmap.weeks[3]?.[0]?.date).toBe("2026-10-25");
    expect(heatmap.weeks[0]?.[0]?.date).toBe("2026-10-04");
  });

  it("grades read days, keeps unread plan days neutral and hides the future", () => {
    const byDate = new Map(cells.map((cell) => [cell.date, cell]));
    expect(byDate.get("2026-10-28")).toMatchObject({ state: "read", level: 2 });
    expect(byDate.get("2026-10-27")).toMatchObject({
      state: "quiet",
      level: 0,
    });
    expect(byDate.get("2026-10-30")?.state).toBe("future");
  });

  it("marks days before the plan as outside it", () => {
    const early = buildHeatmap({
      ...inputFor([], today, 4),
      planStart: "2026-10-20",
    });
    expect(early.weeks[0]?.[0]?.state).toBe("outside");
  });

  it("labels each month at the week holding its first day", () => {
    const long = buildHeatmap(inputFor([], today, 10));
    const october = long.months.find((month) => month.key.month === 10);
    expect(october?.label).toBe("Oct");
    expect(
      long.weeks[october?.week ?? -1]?.some(
        (cell) => cell.date === "2026-10-01",
      ),
    ).toBe(true);
  });
});
