import type { ReadingSnapshot } from "@/lib/dal";
import type { DateKey } from "@/utils/date-key";

import { deriveReadingView } from "../reading-view";
import type { ReadingCompletion, ReadingPlan } from "../types";
import { makeCompletion, makePlan } from "./fixtures";

function snapshotWith(input: {
  plan: ReadingPlan;
  rows: ReadingCompletion[];
}): ReadingSnapshot {
  return {
    plans: [input.plan],
    activePlan: input.plan,
    completions: input.rows,
  };
}

function row(date: DateKey, bookId: string, chapter: number) {
  return makeCompletion(date, { id: `${bookId}-${chapter}`, bookId, chapter });
}

function extra(date: DateKey, bookId: string, chapter: number) {
  return makeCompletion(date, {
    id: `${bookId}-${chapter}`,
    bookId,
    chapter,
    isExtra: true,
  });
}

describe("deriveReadingView", () => {
  it("derives lookups and today from a snapshot", () => {
    const view = deriveReadingView(
      snapshotWith({
        plan: makePlan({ startDate: "2026-10-01" }),
        rows: [row("2026-10-02", "GEN", 2), extra("2026-10-02", "PSA", 23)],
      }),
      "2026-10-03",
    );

    expect(view.today).toBe("2026-10-03");
    expect(view.completionLookup.get("2026-10-02")).toHaveLength(2);
    expect(view.planCompletionLookup.get("2026-10-02")).toHaveLength(1);
    expect(view.currentReadThrough).toBe(1);
  });

  it("derives an empty view from an empty snapshot", () => {
    const view = deriveReadingView(
      { plans: [], activePlan: null, completions: [] },
      "2026-10-03",
    );

    expect(view.activePlan).toBeNull();
    expect(view.completionLookup.has("2026-10-03")).toBe(false);
    expect(view.canStartNextReadThrough).toBe(false);
  });
});
