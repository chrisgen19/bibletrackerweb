import { getCanonIndex } from "@/data/bible/canon-index";
import {
  makeCompletion,
  makePlan,
} from "@/features/reading-plan/domain/__tests__/fixtures";
import { deriveReadingView } from "@/features/reading-plan/domain/reading-view";
import type {
  ReadingCompletion,
  ReadingPlan,
} from "@/features/reading-plan/domain/types";
import type { DateKey } from "@/utils/date-key";

import {
  describeFriendToday,
  type FriendDaySummary,
  summariseFriendDay,
} from "../friend-today";

const INDEX = getCanonIndex("protestant");

function row(date: DateKey, bookId: string, chapter: number, isExtra = false) {
  return makeCompletion(date, {
    id: `${date}-${bookId}-${chapter}`,
    bookId,
    chapter,
    isExtra,
  });
}

function summarise(
  plans: ReadingPlan[],
  rows: ReadingCompletion[],
  today: DateKey,
) {
  const view = deriveReadingView(
    { plans, activePlan: plans.at(-1) ?? null, completions: rows },
    today,
  );
  return summariseFriendDay(view, INDEX);
}

describe("summariseFriendDay", () => {
  it("describes a friend who read today, extras included", () => {
    const summary = summarise(
      [makePlan({ startDate: "2026-10-01" })],
      [row("2026-10-31", "GEN", 3), row("2026-10-31", "PSA", 23, true)],
      "2026-10-31",
    );

    expect(summary.todayPassages).toBe("Genesis 3, Psalms 23");
  });

  it("counts missed scheduled days before today, not today", () => {
    const summary = summarise(
      [makePlan({ startDate: "2026-10-01" })],
      [row("2026-10-28", "GEN", 1)],
      "2026-10-31",
    );

    expect(summary.todayPassages).toBeNull();
    expect(summary.missedInARow).toBe(2);
  });

  it("treats a day with only an extra reading as read", () => {
    const summary = summarise(
      [makePlan({ startDate: "2026-10-01" })],
      [row("2026-10-28", "GEN", 1), row("2026-10-30", "PSA", 23, true)],
      "2026-10-31",
    );

    expect(summary.missedInARow).toBe(0);
  });

  it("counts across a plan change", () => {
    const summary = summarise(
      [
        makePlan({
          id: "plan-1",
          startDate: "2026-10-01",
          endDate: "2026-10-29",
          isActive: false,
        }),
        makePlan({ id: "plan-2", startDate: "2026-10-30" }),
      ],
      [row("2026-10-28", "GEN", 1)],
      "2026-10-31",
    );

    expect(summary.missedInARow).toBe(2);
  });

  it("returns zeros for a friend with no plans", () => {
    expect(summarise([], [], "2026-10-31")).toEqual({
      todayPassages: null,
      missedInARow: 0,
      streak: { current: 0, longest: 0 },
    });
  });
});

describe("describeFriendToday", () => {
  const streak = { current: 4, longest: 9 };
  const base: FriendDaySummary = {
    todayPassages: null,
    missedInARow: 0,
    streak,
  };

  it("uses the exact copy", () => {
    expect(
      describeFriendToday({ ...base, todayPassages: "Genesis 3" }),
    ).toEqual({
      headline: "Read today: Genesis 3",
      detail: "4 day streak · longest 9",
    });
    expect(describeFriendToday(base)).toEqual({
      headline: "Hasn't read yet today",
      detail: "4 day streak · longest 9",
    });
    expect(describeFriendToday({ ...base, missedInARow: 1 })).toEqual({
      headline: "Hasn't read yet today",
      detail: "Missed yesterday · 4 day streak · longest 9",
    });
    expect(describeFriendToday({ ...base, missedInARow: 3 })).toEqual({
      headline: "Hasn't read yet today",
      detail: "Missed the last 3 days · 4 day streak · longest 9",
    });
  });

  it("keeps the streak wording for a single day", () => {
    expect(
      describeFriendToday({ ...base, streak: { current: 1, longest: 1 } })
        .detail,
    ).toBe("1 day streak · longest 1");
  });
});
