// From bibletrackerapp's today-reading-card.test.tsx. On the web the card links to the day
// rather than calling onOpenDetail, so "routes to the day detail" checks the link.
import { fireEvent, render, screen } from "@testing-library/react";

import type { DayReading } from "@/features/reading-plan/domain/types";

import { TodayReadingCard } from "../today-reading-card";

const DETAIL = "/day/2026-08-24";

function makeDay(overrides: Partial<DayReading> = {}): DayReading {
  return {
    date: "2026-08-24",
    status: "today-pending",
    scheduled: {
      kind: "scheduled",
      chapters: [{ bookId: "GEN", chapter: 24 }],
    },
    completedChapters: [],
    plan: null,
    ...overrides,
  };
}

function renderCard(
  day: DayReading,
  handlers: {
    onMarkRead?: () => void;
    progress?: Parameters<typeof TodayReadingCard>[0]["progress"];
  } = {},
) {
  return render(
    <TodayReadingCard
      day={day}
      onMarkRead={handlers.onMarkRead ?? vi.fn()}
      detailHref={DETAIL}
      progress={handlers.progress ?? null}
    />,
  );
}

/** Genesis 24 has 67 verses. */
function partialProgress(readTo: number) {
  return {
    reference: { bookId: "GEN", chapter: 24 },
    verseCount: 67,
    read: [{ from: 1, to: readTo }],
    remaining: [{ from: readTo + 1, to: 67 }],
    isComplete: false,
    isPartial: true,
  };
}

describe("TodayReadingCard", () => {
  it('answers "what should I read today?"', () => {
    renderCard(makeDay());

    expect(screen.getByText("Genesis 24")).toBeTruthy();
    expect(screen.getByText("One chapter")).toBeTruthy();
  });

  it("marks the reading complete when the primary action is pressed", () => {
    const onMarkRead = vi.fn();
    renderCard(makeDay(), { onMarkRead });

    fireEvent.click(screen.getByTestId("mark-today-read"));
    expect(onMarkRead).toHaveBeenCalledTimes(1);
  });

  it("replaces the action with a confirmation once completed", () => {
    renderCard(
      makeDay({
        status: "completed",
        completedChapters: [{ bookId: "GEN", chapter: 24 }],
      }),
    );

    expect(screen.getByText("Completed today")).toBeTruthy();
    // Undo is intentionally not offered as the primary action here.
    expect(screen.queryByTestId("mark-today-read")).toBeNull();
  });

  it("shows what was actually read, not the schedule, once logged", () => {
    // Regression: logging Genesis 50 on a day scheduled for Genesis 24 used to leave the
    // card announcing "Genesis 24, Completed today", contradicting the day sheet.
    renderCard(
      makeDay({
        status: "completed",
        completedChapters: [{ bookId: "GEN", chapter: 50 }],
      }),
    );

    expect(screen.getByText("Genesis 50")).toBeTruthy();
    expect(screen.queryByText("Genesis 24")).toBeNull();
  });

  it("still shows the schedule while the day is unread", () => {
    renderCard(makeDay());
    expect(screen.getByText("Genesis 24")).toBeTruthy();
  });

  it("routes to the day detail for undo", () => {
    renderCard(makeDay({ status: "completed" }));

    expect(screen.getByTestId("open-today-detail").getAttribute("href")).toBe(
      DETAIL,
    );
  });

  it("celebrates finishing the canon instead of offering an empty reading", () => {
    renderCard(
      makeDay({
        status: "canon-complete",
        scheduled: { kind: "canon-complete" },
      }),
    );

    expect(screen.getByText("You have finished the Bible")).toBeTruthy();
    expect(screen.queryByTestId("mark-today-read")).toBeNull();
  });

  it("explains a plan that has not started yet", () => {
    renderCard(
      makeDay({ status: "before-plan", scheduled: { kind: "before-plan" } }),
    );

    expect(screen.getByText("Your plan starts soon")).toBeTruthy();
  });

  it("shows what is left when the chapter is part-read", () => {
    renderCard(
      makeDay({
        status: "completed",
        completedChapters: [{ bookId: "GEN", chapter: 24 }],
      }),
      { progress: partialProgress(10) },
    );
    expect(screen.getByText("11–67 still to read")).toBeTruthy();
  });

  it("offers to continue rather than claiming the day is done", () => {
    // The day has a reading recorded, but the chapter is unfinished: saying "Completed
    // today" here would be a small lie.
    renderCard(
      makeDay({
        status: "completed",
        completedChapters: [{ bookId: "GEN", chapter: 24 }],
      }),
      { progress: partialProgress(10) },
    );

    expect(screen.queryByText("Completed today")).toBeNull();
    expect(screen.getByTestId("continue-reading").getAttribute("href")).toBe(
      DETAIL,
    );
  });

  it("says completed once the whole chapter is read", () => {
    renderCard(
      makeDay({
        status: "completed",
        completedChapters: [{ bookId: "GEN", chapter: 24 }],
      }),
      {
        progress: {
          reference: { bookId: "GEN", chapter: 24 },
          verseCount: 67,
          read: [{ from: 1, to: 67 }],
          remaining: [],
          isComplete: true,
          isPartial: false,
        },
      },
    );
    expect(screen.getByText("Completed today")).toBeTruthy();
  });

  it("treats two spans of one chapter as one chapter", () => {
    // Regression: reading 1-10 then finishing the same day leaves two rows, which
    // rendered as "Genesis 24-24" and "2 chapters".
    renderCard(
      makeDay({
        status: "completed",
        completedChapters: [
          { bookId: "GEN", chapter: 24 },
          { bookId: "GEN", chapter: 24 },
        ],
      }),
    );

    expect(screen.getByText("Genesis 24")).toBeTruthy();
    expect(screen.queryByText("Genesis 24–24")).toBeNull();
    expect(screen.getByText("One chapter")).toBeTruthy();
  });

  it("pluralises multi-chapter days", () => {
    renderCard(
      makeDay({
        scheduled: {
          kind: "scheduled",
          chapters: [
            { bookId: "GEN", chapter: 1 },
            { bookId: "GEN", chapter: 2 },
          ],
        },
      }),
    );

    expect(screen.getByText("Genesis 1–2")).toBeTruthy();
    expect(screen.getByText("2 chapters")).toBeTruthy();
  });
});
