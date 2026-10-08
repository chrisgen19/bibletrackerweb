// Web-only (bibletrackerweb#18): extra readings in the day sheet. The iOS port of the
// sheet's tests is day-detail.dom.test.tsx.
import { fireEvent, render, screen } from "@testing-library/react";

import { makePlan } from "@/features/reading-plan/domain/__tests__/fixtures";
import { createCompletionLookup } from "@/features/reading-plan/domain/schedule";
import type {
  DayReading,
  ReadingCompletion,
} from "@/features/reading-plan/domain/types";

import { DayDetail } from "../day-detail";
import type { DayDetailProps } from "../types";

const TODAY = "2026-10-07";
const LEVITICUS_24 = { bookId: "LEV", chapter: 24 };
const REVELATION_5 = { bookId: "REV", chapter: 5 };

function makeDay(overrides: Partial<DayReading> = {}): DayReading {
  return {
    date: TODAY,
    status: "today-pending",
    scheduled: { kind: "scheduled", chapters: [LEVITICUS_24] },
    completedChapters: [],
    plan: makePlan({ startDate: "2026-10-01", startBookId: "LEV" }),
    ...overrides,
  };
}

function row(
  id: string,
  reference: { bookId: string; chapter: number },
  isExtra = false,
): ReadingCompletion {
  return {
    id,
    readingPlanId: "plan-1",
    localDate: TODAY,
    ...reference,
    verses: null,
    completedAt: 0,
    isExtra,
  };
}

function renderDetail(day: DayReading, handlers: Partial<DayDetailProps> = {}) {
  const props: DayDetailProps = {
    day,
    today: TODAY,
    onComplete: vi.fn(() => true),
    onUndo: vi.fn(),
    onUndoEntry: vi.fn(),
    onChangePlan: vi.fn(),
    completions: createCompletionLookup([]),
    rows: [],
    extraRows: [],
    onSetExtra: vi.fn(),
    onCountTowardPlan: vi.fn(),
    classifyReading: () => "plan",
    progress: null,
    getProgressFor: () => null,
    getCompletedOnFor: () => null,
    currentPosition: LEVITICUS_24,
    focusChapter: null,
    ...handlers,
  };
  render(<DayDetail heading="page" {...props} />);
  return props;
}

const press = (testId: string) => fireEvent.click(screen.getByTestId(testId));
const dialogButtons = () =>
  screen
    .getAllByRole("button")
    .filter((button) => button.closest('[role="alertdialog"]'))
    .map((button) => button.textContent);

describe("DayDetail: a Custom reading far from the plan", () => {
  function logRevelation5(handlers: Partial<DayDetailProps> = {}) {
    const props = renderDetail(makeDay(), {
      focusChapter: REVELATION_5,
      classifyReading: () => "extra",
      ...handlers,
    });
    press("log-custom-reading");
    return props;
  }

  it("is recorded as an extra reading with its own row id", () => {
    const { onComplete } = logRevelation5();
    expect(onComplete).toHaveBeenCalledWith([REVELATION_5], undefined, {
      isExtra: true,
      ids: [expect.any(String)],
    });
  });

  it("says so, keeps the plan where it is, and offers to move it instead", () => {
    logRevelation5();
    const notice = screen.getByRole("alertdialog").textContent;
    expect(notice).toContain(
      "Revelation 5 is logged as an extra reading. Your plan stays at Leviticus 24.",
    );
    expect(notice).toContain(
      "Move your plan to carry on from Revelation 6 instead?",
    );
    expect(dialogButtons()).toEqual(["Keep as extra", "Move my plan"]);
  });

  it("changes nothing when kept as extra", () => {
    const { onChangePlan, onSetExtra, onCountTowardPlan } = logRevelation5();
    press("keep-extra");
    expect(onChangePlan).not.toHaveBeenCalled();
    expect(onSetExtra).not.toHaveBeenCalled();
    expect(onCountTowardPlan).not.toHaveBeenCalled();
  });

  // Review on #19 (Codex): one write, so the reading only joins once the plan has moved.
  it("moves the plan on and brings the reading into it as one write", () => {
    const { onComplete, onChangePlan, onSetExtra, onCountTowardPlan } =
      logRevelation5();
    const [, , options] = vi.mocked(onComplete).mock.calls[0] ?? [];
    press("count-toward-plan");
    expect(onCountTowardPlan).toHaveBeenCalledWith(
      options?.ids?.[0],
      expect.objectContaining({ startBookId: "REV", startChapter: 6 }),
    );
    expect(onChangePlan).not.toHaveBeenCalled();
    expect(onSetExtra).not.toHaveBeenCalled();
  });

  // Review on #22 (Codex): a reading on that day stays in the earlier read-through, so
  // moving the current plan on from it would skip a chapter.
  it("does not offer to move the plan on a day from an earlier read-through", () => {
    const { onCountTowardPlan } = logRevelation5({
      canMovePlan: false,
      currentPosition: null,
    });
    expect(dialogButtons()).toEqual(["Keep as extra", "Count toward plan"]);
    press("count-toward-plan");
    expect(onCountTowardPlan).toHaveBeenCalledWith(expect.any(String), null);
  });

  it("only offers to count it when there is nothing to carry on to", () => {
    const { onCountTowardPlan } = renderDetail(makeDay(), {
      focusChapter: { bookId: "REV", chapter: 22 },
      classifyReading: () => "extra",
    });
    press("log-custom-reading");
    expect(dialogButtons()).toEqual(["Keep as extra", "Count toward plan"]);
    press("count-toward-plan");
    expect(onCountTowardPlan).toHaveBeenCalledWith(expect.any(String), null);
  });

  it("still asks the usual question for a plan reading", () => {
    const { onComplete } = renderDetail(makeDay(), {
      focusChapter: { bookId: "LEV", chapter: 26 },
      classifyReading: () => "plan",
    });
    press("log-custom-reading");
    expect(onComplete).toHaveBeenCalledWith(
      [{ bookId: "LEV", chapter: 26 }],
      undefined,
    );
    expect(dialogButtons()).toEqual(["Keep my plan", "Continue from here"]);
  });
});

describe("DayDetail: extra readings on a day", () => {
  it("lists them apart from the plan, each with its own actions", () => {
    const extra = row("extra-1", REVELATION_5, true);
    const { onSetExtra, onUndoEntry } = renderDetail(makeDay(), {
      extraRows: [extra],
    });

    // getBy* throws when nothing matches.
    screen.getByRole("heading", { name: "EXTRA READINGS" });
    screen.getByText("Revelation 5");

    press("count-entry-extra-1");
    expect(onSetExtra).toHaveBeenCalledWith("extra-1", false);
    press("remove-extra-extra-1");
    expect(onUndoEntry).toHaveBeenCalledWith("extra-1");
  });

  it("still offers the plan's reading on a day holding only an extra", () => {
    renderDetail(makeDay(), {
      extraRows: [row("extra-1", REVELATION_5, true)],
    });
    expect(screen.getByTestId("mark-day-read").textContent).toBe(
      "Mark Leviticus 24 as Read",
    );
  });

  it("does not call a past day with an extra reading empty", () => {
    renderDetail(
      makeDay({
        date: "2026-10-05",
        status: "missed",
        scheduled: { kind: "not-scheduled" },
      }),
      { extraRows: [row("extra-1", REVELATION_5, true)] },
    );
    screen.getByText(/No plan reading was recorded on this day/);
  });

  it("lets a recorded plan reading be marked as extra", () => {
    const planRow = row("plan-row", LEVITICUS_24);
    const { onSetExtra } = renderDetail(
      makeDay({ status: "completed", completedChapters: [LEVITICUS_24] }),
      { rows: [planRow] },
    );
    press("mark-extra");
    expect(onSetExtra).toHaveBeenCalledWith("plan-row", true);
  });
});
