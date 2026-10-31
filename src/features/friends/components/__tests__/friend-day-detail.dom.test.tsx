import { render, screen } from "@testing-library/react";

import { PROTESTANT_CANON_INDEX } from "@/data/bible/canon-index";
import { describeRow } from "@/features/progress/components/day-detail/day-detail-logic";
import { describePassages } from "@/features/progress/domain/reading-journal";
import {
  makeCompletion,
  makePlan,
} from "@/features/reading-plan/domain/__tests__/fixtures";
import { deriveReadingView } from "@/features/reading-plan/domain/reading-view";
import type { ReadingCompletion } from "@/features/reading-plan/domain/types";
import { ReadingViewProvider } from "@/features/reading-plan/hooks/reading-view-context";

import { FriendDayDetail } from "../friend-profile/friend-day-detail";

const PLAN = makePlan({ startDate: "2026-10-01" });
const TODAY = "2026-10-31";

function renderDay(
  date: string,
  completions: readonly ReadingCompletion[],
  heading: "page" | "sheet" = "page",
) {
  const view = deriveReadingView(
    { plans: [PLAN], activePlan: PLAN, completions: [...completions] },
    TODAY,
  );
  render(
    <ReadingViewProvider view={view}>
      <FriendDayDetail date={date} heading={heading} />
    </ReadingViewProvider>,
  );
}

describe("FriendDayDetail", () => {
  it("shows what was planned and read, verse spans included", () => {
    const rows = [
      makeCompletion("2026-10-03", {
        bookId: "PSA",
        chapter: 119,
        verses: { from: 1, to: 40 },
      }),
    ];
    renderDay("2026-10-03", rows);

    expect(
      screen.getByRole("heading", { level: 1, name: "3 October 2026" }),
    ).toBeTruthy();
    expect(screen.getByText("SATURDAY")).toBeTruthy();
    expect(screen.getByText("Planned")).toBeTruthy();
    expect(screen.getByText("Read")).toBeTruthy();
    // The verse span is part of the line, not just the chapter.
    const read = describePassages(rows, PROTESTANT_CANON_INDEX);
    expect(read).toMatch(/^Psalms 119:1.40$/);
    expect(screen.getByText(read)).toBeTruthy();
  });

  it("calls the friend's current day TODAY", () => {
    renderDay(TODAY, []);

    expect(screen.getByText("TODAY")).toBeTruthy();
    expect(screen.getByText("Not read yet")).toBeTruthy();
  });

  it("lists extra readings", () => {
    const extra = makeCompletion("2026-10-03", {
      id: "extra-1",
      bookId: "PSA",
      chapter: 23,
      isExtra: true,
    });
    renderDay("2026-10-03", [
      makeCompletion("2026-10-03", { chapter: 3 }),
      extra,
    ]);

    expect(screen.getByText("EXTRA READINGS")).toBeTruthy();
    expect(
      screen.getByText(describeRow(extra, PROTESTANT_CANON_INDEX)),
    ).toBeTruthy();
  });

  it("says not read on a missed past day", () => {
    renderDay("2026-10-05", []);

    expect(screen.getByText("Not read")).toBeTruthy();
    expect(screen.queryByText("Read")).toBeNull();
  });

  it("shows only the plan on a future day", () => {
    renderDay("2026-11-05", []);

    expect(screen.getByText("Planned")).toBeTruthy();
    expect(screen.queryByText("Read")).toBeNull();
    expect(screen.queryByText("Not read")).toBeNull();
    expect(screen.queryByText("Not read yet")).toBeNull();
  });

  it("has no controls", () => {
    renderDay("2026-10-03", [makeCompletion("2026-10-03", { chapter: 3 })]);

    expect(screen.queryAllByRole("button")).toEqual([]);
  });

  it.each([
    "2026-13-45",
    "abc",
  ])("shows the unavailable state for %s", (date) => {
    renderDay(date, []);

    expect(screen.getByText("That day isn't available")).toBeTruthy();
    expect(screen.queryAllByRole("button")).toEqual([]);
    expect(screen.queryAllByRole("link")).toEqual([]);
  });
});
