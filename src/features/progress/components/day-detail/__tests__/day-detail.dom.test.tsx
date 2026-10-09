// From bibletrackerapp's day-detail.test.tsx, test for test. React Native's Alert.alert is
// the "Continue from here?" AlertDialog on the web, so pressing its buttons is a click and
// "no alert" means no alertdialog on the page.
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makePlan } from "@/features/reading-plan/domain/__tests__/fixtures";
import type { ChapterProgress } from "@/features/reading-plan/domain/chapter-progress";
import { createCompletionLookup } from "@/features/reading-plan/domain/schedule";
import type {
  DayReading,
  ReadingCompletion,
} from "@/features/reading-plan/domain/types";

import { DayDetail } from "../day-detail";
import type { DayDetailProps } from "../types";

const TODAY = "2026-08-09";

function makeDay(overrides: Partial<DayReading> = {}): DayReading {
  return {
    date: TODAY,
    status: "today-pending",
    scheduled: {
      kind: "scheduled",
      chapters: [{ bookId: "GEN", chapter: 21 }],
    },
    completedChapters: [],
    plan: makePlan({ startDate: "2026-07-20" }),
    ...overrides,
  };
}

/** One row per recorded chapter, which is what the sheet actually renders from. */
function rowsFor(day: DayReading): ReadingCompletion[] {
  return day.completedChapters.map((reference, position) => ({
    id: `row-${position}`,
    readingPlanId: "plan-1",
    localDate: day.date,
    bookId: reference.bookId,
    chapter: reference.chapter,
    verses: null,
    completedAt: 0,
  }));
}

function renderDetail(day: DayReading, handlers: Partial<DayDetailProps> = {}) {
  const onComplete = handlers.onComplete ?? vi.fn(() => true);
  const onUndo = handlers.onUndo ?? vi.fn();
  const onUndoEntry = handlers.onUndoEntry ?? vi.fn();
  const onChangePlan = handlers.onChangePlan ?? vi.fn();
  render(
    <DayDetail
      heading="page"
      day={day}
      today={handlers.today ?? TODAY}
      onComplete={onComplete}
      onUndo={onUndo}
      onUndoEntry={onUndoEntry}
      onChangePlan={onChangePlan}
      completions={handlers.completions ?? createCompletionLookup([])}
      rows={handlers.rows ?? rowsFor(day)}
      // No extras, and every Custom log is a plan reading,
      // so the ported cases run exactly as on iOS. extra-readings.dom.test.tsx covers them.
      extraRows={handlers.extraRows ?? []}
      onSetExtra={handlers.onSetExtra ?? vi.fn()}
      onCountTowardPlan={handlers.onCountTowardPlan ?? vi.fn()}
      classifyReading={handlers.classifyReading ?? (() => "plan")}
      progress={handlers.progress ?? null}
      getProgressFor={handlers.getProgressFor ?? (() => null)}
      getCompletedOnFor={handlers.getCompletedOnFor ?? (() => null)}
      currentPosition={handlers.currentPosition ?? null}
      focusChapter={handlers.focusChapter ?? null}
    />,
  );
  return { onComplete, onUndo, onUndoEntry, onChangePlan };
}

const press = (testId: string) => fireEvent.click(screen.getByTestId(testId));
const pressLabel = (label: string) =>
  fireEvent.click(screen.getByLabelText(label));
const alertShown = () => screen.queryByRole("alertdialog") !== null;

describe("DayDetail: plan tab", () => {
  it("shows the scheduled reading and marks it complete", () => {
    const { onComplete } = renderDetail(makeDay());

    expect(screen.getByText("Genesis 21")).toBeTruthy();
    press("mark-day-read");
    // No span: verse tracking is off when the sheet has no chapter progress.
    expect(onComplete).toHaveBeenCalledWith(
      [{ bookId: "GEN", chapter: 21 }],
      undefined,
    );
  });

  it("offers undo once completed, showing what was actually recorded", () => {
    const { onUndo } = renderDetail(
      makeDay({
        status: "completed",
        completedChapters: [{ bookId: "JHN", chapter: 3 }],
      }),
    );

    expect(screen.getByText("John 3 completed")).toBeTruthy();
    press("undo-completion");
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it("keeps future days view-only with no tabs", () => {
    renderDetail(makeDay({ date: "2026-09-01", status: "upcoming" }));

    expect(
      screen.getByText("You can mark this reading once the day arrives."),
    ).toBeTruthy();
    expect(screen.queryByTestId("mark-day-read")).toBeNull();
    expect(screen.queryByTestId("day-tab-custom")).toBeNull();
  });
});

/** Genesis 21 has 34 verses. */
function progressFor(read: { from: number; to: number }[]): ChapterProgress {
  const verseCount = 34;
  const remaining: { from: number; to: number }[] = [];
  let cursor = 1;
  for (const r of read) {
    if (r.from > cursor) remaining.push({ from: cursor, to: r.from - 1 });
    cursor = Math.max(cursor, r.to + 1);
  }
  if (cursor <= verseCount) remaining.push({ from: cursor, to: verseCount });
  return {
    reference: { bookId: "GEN", chapter: 21 },
    verseCount,
    read,
    remaining,
    isComplete: remaining.length === 0,
    isPartial: read.length > 0 && remaining.length > 0,
  };
}

describe("DayDetail: partial chapters", () => {
  it("offers a verse limit when a single chapter is scheduled", () => {
    renderDetail(makeDay(), { progress: progressFor([]) });
    expect(screen.getByTestId("field-to-verse")).toBeTruthy();
  });

  it("defaults to the whole chapter, so one tap still records everything", () => {
    const onComplete = vi.fn(() => true);
    renderDetail(makeDay(), { progress: progressFor([]), onComplete });

    press("mark-day-read");

    expect(onComplete).toHaveBeenCalledWith([{ bookId: "GEN", chapter: 21 }], {
      from: 1,
      to: 34,
    });
  });

  it("records only as far as the chosen verse", () => {
    const onComplete = vi.fn(() => true);
    renderDetail(makeDay(), { progress: progressFor([]), onComplete });

    press("field-to-verse");
    pressLabel("To verse 10");
    press("mark-day-read");

    expect(onComplete).toHaveBeenCalledWith([{ bookId: "GEN", chapter: 21 }], {
      from: 1,
      to: 10,
    });
  });

  it("shows what is read and what is left when a chapter is unfinished", () => {
    renderDetail(
      makeDay({
        status: "completed",
        completedChapters: [{ bookId: "GEN", chapter: 21 }],
      }),
      { progress: progressFor([{ from: 1, to: 10 }]) },
    );
    expect(
      screen.getByText("You’ve read verses 1–10. Verses 11–34 still to go."),
    ).toBeTruthy();
  });

  it("still offers to continue when the day is marked but the chapter is not finished", () => {
    // The crux: reading 1-10 completes the *day* but not the *chapter*.
    const onComplete = vi.fn(() => true);
    renderDetail(
      makeDay({
        status: "completed",
        completedChapters: [{ bookId: "GEN", chapter: 21 }],
      }),
      { progress: progressFor([{ from: 1, to: 10 }]), onComplete },
    );

    press("mark-day-read");

    // Resumes at 11 rather than starting over.
    expect(onComplete).toHaveBeenCalledWith([{ bookId: "GEN", chapter: 21 }], {
      from: 11,
      to: 34,
    });
  });

  it("shows the completed state once every verse is read", () => {
    renderDetail(
      makeDay({
        status: "completed",
        completedChapters: [{ bookId: "GEN", chapter: 21 }],
      }),
      { progress: progressFor([{ from: 1, to: 34 }]) },
    );
    expect(screen.getByTestId("undo-completion")).toBeTruthy();
    expect(screen.queryByTestId("mark-day-read")).toBeNull();
  });

  it("records the span against the scheduled chapter, not everything logged that day", () => {
    // Regression: a day holding both a partial scheduled read and a custom log of a
    // different chapter passed two chapters, so the repository dropped the span and wrote
    // whole-chapter sentinels, falsely completing the scheduled chapter.
    const onComplete = vi.fn(() => true);
    renderDetail(
      makeDay({
        status: "completed",
        completedChapters: [
          { bookId: "GEN", chapter: 21 },
          { bookId: "EXO", chapter: 1 },
        ],
      }),
      { progress: progressFor([{ from: 1, to: 10 }]), onComplete },
    );

    press("mark-day-read");

    expect(onComplete).toHaveBeenCalledWith([{ bookId: "GEN", chapter: 21 }], {
      from: 11,
      to: 34,
    });
  });

  it("does not claim the day is complete just because the chapter was read elsewhere", () => {
    // Chapter progress spans every date. A chapter read on another day, then scheduled
    // again after a plan change, must not mark this day complete.
    renderDetail(makeDay({ status: "today-pending", completedChapters: [] }), {
      progress: progressFor([{ from: 1, to: 34 }]),
    });

    expect(screen.queryByTestId("undo-completion")).toBeNull();
    expect(screen.getByTestId("mark-day-read")).toBeTruthy();
  });

  it("names the finished chapter once, not as a span of itself", () => {
    // Reading 1-10 then 11-end on the same date leaves two rows for one chapter. The
    // confirmation used to read "Genesis 21-21 completed".
    renderDetail(
      makeDay({
        status: "completed",
        completedChapters: [
          { bookId: "GEN", chapter: 21 },
          { bookId: "GEN", chapter: 21 },
        ],
      }),
      { progress: progressFor([{ from: 1, to: 34 }]) },
    );

    expect(screen.getByText("Genesis 21 completed")).toBeTruthy();
    expect(screen.queryByText("Genesis 21–21 completed")).toBeNull();
  });

  it("does not offer verse tracking on a future day", () => {
    renderDetail(makeDay({ date: "2026-09-01", status: "upcoming" }), {
      progress: progressFor([]),
    });
    expect(screen.queryByTestId("field-to-verse")).toBeNull();
  });

  it("resumes from the first unread verse in the picker", () => {
    renderDetail(
      makeDay({
        status: "completed",
        completedChapters: [{ bookId: "GEN", chapter: 21 }],
      }),
      { progress: progressFor([{ from: 1, to: 10 }]) },
    );

    press("field-to-verse");
    // Already-read verses are not offered again.
    expect(screen.queryByLabelText("To verse 5")).toBeNull();
    expect(screen.queryByLabelText("To verse 11")).not.toBeNull();
  });
});

describe("DayDetail: custom tab", () => {
  it("logs an arbitrary chapter for the day", () => {
    const { onComplete } = renderDetail(makeDay());

    press("day-tab-custom");
    press("log-custom-reading");

    // Defaults to the scheduled chapter until the reader picks something else. No span:
    // verse tracking is off when the sheet has no chapter progress.
    expect(onComplete).toHaveBeenCalledWith(
      [{ bookId: "GEN", chapter: 21 }],
      undefined,
    );
  });

  it("asks whether to move the plan, and does nothing to it when declined", () => {
    const { onChangePlan } = renderDetail(makeDay());

    press("day-tab-custom");
    press("log-custom-reading");

    const buttons = screen
      .getAllByRole("button")
      .filter((b) => b.closest('[role="alertdialog"]'));
    expect(buttons.map((b) => b.textContent)).toEqual([
      "Keep my plan",
      "Continue from here",
    ]);
    fireEvent.click(screen.getByText("Keep my plan"));
    expect(onChangePlan).not.toHaveBeenCalled();
  });

  it("moves the position to the next chapter when accepted", () => {
    const { onChangePlan } = renderDetail(makeDay());

    press("day-tab-custom");
    press("log-custom-reading");
    fireEvent.click(screen.getByText("Continue from here"));

    expect(onChangePlan).toHaveBeenCalledWith({
      canonId: "protestant",
      // Logged today, so the plan resumes tomorrow: today keeps its own history.
      startDate: "2026-08-10",
      startBookId: "GEN",
      startChapter: 22,
      chaptersPerDay: 1,
    });
  });

  it("clears the verse selection after logging, as the plan tab does", () => {
    renderDetail(makeDay(), { getProgressFor: () => progressFor([]) });

    press("day-tab-custom");
    press("custom-field-to-verse");
    pressLabel("To verse 10");
    expect(screen.queryByText("Log Genesis 21:1–10 as Read")).not.toBeNull();

    press("log-custom-reading");

    // A stale selection is how the reversed span below becomes reachable.
    expect(screen.queryByText("Log Genesis 21:1–10 as Read")).toBeNull();
    expect(screen.queryByText("Log Genesis 21 as Read")).not.toBeNull();
  });

  it("never writes a reversed span after progress advances past the stale selection", () => {
    // The sheet stays open after logging, so progress refreshes underneath it: fromVerse
    // moves to 11 while a stale toVerse of 10 remains, giving 11-10. normaliseRanges
    // swaps that to 10-11 and marks verse 11 read unread.
    let read: { from: number; to: number }[] = [];
    const onComplete = vi.fn(
      (_chapters: unknown, verses?: { from: number; to: number }) => {
        if (verses !== undefined) read = [...read, verses];
        return true;
      },
    );
    renderDetail(makeDay(), {
      onComplete,
      getProgressFor: () => progressFor(read),
    });

    press("day-tab-custom");
    press("custom-field-to-verse");
    pressLabel("To verse 10");
    press("log-custom-reading");

    // Re-opening the picker re-renders against the refreshed progress.
    press("custom-field-to-verse");
    expect(screen.queryByText("Log Genesis 21:11–10 as Read")).toBeNull();

    press("log-custom-reading");
    for (const span of onComplete.mock.calls.map((call) => call[1])) {
      if (span !== undefined) expect(span.to).toBeGreaterThanOrEqual(span.from);
    }
  });

  it("does not offer to move the plan past verses that are still unread", () => {
    // Regression: the continuation draft starts at the chapter *after* the one logged.
    // Offering it after a partial read would advance the plan to Genesis 22 while 11-34
    // of Genesis 21 had never been read, re-creating the very loss this feature exists
    // to prevent.
    const { onComplete, onChangePlan } = renderDetail(makeDay(), {
      getProgressFor: () => progressFor([]),
    });

    press("day-tab-custom");
    press("custom-field-to-verse");
    pressLabel("To verse 10");
    press("log-custom-reading");

    expect(onComplete).toHaveBeenCalledWith([{ bookId: "GEN", chapter: 21 }], {
      from: 1,
      to: 10,
    });
    expect(alertShown()).toBe(false);
    expect(onChangePlan).not.toHaveBeenCalled();
  });

  it("offers to move the plan once a resumed chapter is actually finished", () => {
    // The mirror of the case above: 1-10 were read earlier, the reader now reads 11-34,
    // so the chapter is genuinely done and continuing is correct.
    const { onComplete, onChangePlan } = renderDetail(makeDay(), {
      getProgressFor: () => progressFor([{ from: 1, to: 10 }]),
    });

    press("day-tab-custom");
    press("custom-field-to-verse");
    pressLabel("To verse 34, finishes the chapter");
    press("log-custom-reading");

    expect(onComplete).toHaveBeenCalledWith([{ bookId: "GEN", chapter: 21 }], {
      from: 11,
      to: 34,
    });
    fireEvent.click(screen.getByText("Continue from here"));
    expect(onChangePlan).toHaveBeenCalledWith(
      expect.objectContaining({ startBookId: "GEN", startChapter: 22 }),
    );
  });

  it("does not offer to continue past the end of the canon", () => {
    // CustomPanel seeds its state from the day's recorded chapter, so setting
    // completedChapters to Revelation 22 is what puts the picker at the canon end.
    const { onComplete } = renderDetail(
      makeDay({
        completedChapters: [{ bookId: "REV", chapter: 22 }],
        status: "completed",
      }),
    );

    press("day-tab-custom");
    press("log-custom-reading");

    expect(onComplete).toHaveBeenCalledWith(
      [{ bookId: "REV", chapter: 22 }],
      undefined,
    );
    expect(alertShown()).toBe(false);
  });

  it("does not claim success when the write is rejected", () => {
    // Regression: with no plan to attach to, completeReading writes nothing. The sheet
    // used to show "<chapter> is logged" and offer a continuation anyway.
    const onComplete = vi.fn(() => false);
    const { onChangePlan } = renderDetail(makeDay(), { onComplete });

    press("day-tab-custom");
    press("log-custom-reading");

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(alertShown()).toBe(false);
    expect(onChangePlan).not.toHaveBeenCalled();
  });

  it("lets a day the plan never covered still be logged", () => {
    const { onComplete } = renderDetail(
      makeDay({
        date: "2026-07-01",
        status: "before-plan",
        scheduled: { kind: "before-plan" },
        plan: null,
      }),
    );

    expect(
      screen.getByText(
        "You can still record what you read using the Custom tab.",
      ),
    ).toBeTruthy();

    press("day-tab-custom");
    press("log-custom-reading");
    // Exercises the plan: null path through buildContinuationDraft.
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe("DayDetail: a day that passed unread", () => {
  it("says the position is unchanged rather than claiming the plan had not started", () => {
    // Regression: the new `not-scheduled` kind fell through to the before-plan copy,
    // telling the reader their plan had not begun on a day well inside it.
    renderDetail(
      makeDay({
        date: "2026-08-05",
        status: "missed",
        scheduled: { kind: "not-scheduled" },
        completedChapters: [],
      }),
      { today: TODAY },
    );
    expect(
      screen.getByText(/your place in the plan moves as you read/),
    ).toBeTruthy();
    expect(screen.queryByText(/hadn’t started yet/)).toBeNull();
  });
});

describe("DayDetail: catching up on a missed day", () => {
  const LEVITICUS_6 = { bookId: "LEV", chapter: 6 };

  /** Leviticus 6 has 30 verses. */
  function leviticusProgress(
    read: { from: number; to: number }[],
  ): ChapterProgress {
    const verseCount = 30;
    const remaining: { from: number; to: number }[] = [];
    let cursor = 1;
    for (const r of read) {
      if (r.from > cursor) remaining.push({ from: cursor, to: r.from - 1 });
      cursor = Math.max(cursor, r.to + 1);
    }
    if (cursor <= verseCount) remaining.push({ from: cursor, to: verseCount });
    return {
      reference: LEVITICUS_6,
      verseCount,
      read,
      remaining,
      isComplete: remaining.length === 0,
      isPartial: read.length > 0 && remaining.length > 0,
    };
  }

  function missedDay() {
    return makeDay({
      date: "2026-08-05",
      status: "missed",
      scheduled: { kind: "not-scheduled" },
      completedChapters: [],
    });
  }

  it("seeds the custom tab from the reading position, not Genesis 1", () => {
    // The regression. A missed day schedules nothing, so both fallbacks used to land on
    // `index.firstReference`. Setting only the verse then recorded Genesis 1 against a
    // day the reader had spent in Leviticus.
    const { onComplete } = renderDetail(missedDay(), {
      currentPosition: LEVITICUS_6,
    });

    press("day-tab-custom");

    expect(screen.getByText("Leviticus")).toBeTruthy();
    expect(screen.getByText("6")).toBeTruthy();

    press("log-custom-reading");
    expect(onComplete).toHaveBeenCalledWith([LEVITICUS_6], undefined);
  });

  it("falls back to Genesis 1 only when there is no position at all", () => {
    const { onComplete } = renderDetail(missedDay(), { currentPosition: null });

    press("day-tab-custom");
    press("log-custom-reading");

    expect(onComplete).toHaveBeenCalledWith(
      [{ bookId: "GEN", chapter: 1 }],
      undefined,
    );
  });

  it("offers the catch-up without leaving the plan tab", () => {
    const { onComplete } = renderDetail(missedDay(), {
      currentPosition: LEVITICUS_6,
      getProgressFor: () => leviticusProgress([]),
    });

    expect(
      screen.getByText(/your place in the plan moves as you read/),
    ).toBeTruthy();
    expect(screen.getByText("Mark Leviticus 6 as Read")).toBeTruthy();

    press("catch-up-field-to-verse");
    pressLabel("To verse 7");
    press("catch-up-submit");

    expect(onComplete).toHaveBeenCalledWith([LEVITICUS_6], { from: 1, to: 7 });
  });

  it("does not offer a catch-up on a day before the plan began", () => {
    renderDetail(
      makeDay({
        date: "2026-07-01",
        status: "before-plan",
        scheduled: { kind: "before-plan" },
        plan: null,
      }),
      {
        currentPosition: LEVITICUS_6,
        getProgressFor: () => leviticusProgress([]),
      },
    );

    expect(screen.queryByTestId("catch-up-submit")).toBeNull();
    expect(
      screen.getByText(
        "You can still record what you read using the Custom tab.",
      ),
    ).toBeTruthy();
  });

  it("does not ask to move the plan when logging the chapter already at the head", () => {
    // The queue steps over finished chapters by itself, so there is nothing to move.
    // Accepting the prompt would rewrite the plan start and drop every chapter still
    // unread before it.
    const { onChangePlan } = renderDetail(
      makeDay({
        scheduled: {
          kind: "scheduled",
          chapters: [{ bookId: "GEN", chapter: 21 }],
        },
      }),
      { currentPosition: { bookId: "GEN", chapter: 21 } },
    );

    press("day-tab-custom");
    press("log-custom-reading");

    expect(alertShown()).toBe(false);
    expect(onChangePlan).not.toHaveBeenCalled();
  });
});

describe("DayDetail: a chapter that is already finished", () => {
  const complete = progressFor([{ from: 1, to: 34 }]);

  it("says so instead of offering it as a fresh reading", () => {
    // A finished chapter leaves `remaining` empty, so fromVerse fell back to 1 and the
    // control read exactly like an untouched chapter: "Log Genesis 21 as Read".
    renderDetail(makeDay(), {
      getProgressFor: () => complete,
      getCompletedOnFor: () => "2026-08-07",
    });

    press("day-tab-custom");

    expect(
      screen.getByText(
        "Genesis 21 is already fully read — completed on 7 August.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Log Genesis 21 Again")).toBeTruthy();
    expect(screen.queryByText("Log Genesis 21 as Read")).toBeNull();
  });

  it("distinguishes a chapter recorded on the day being viewed", () => {
    renderDetail(makeDay(), {
      getProgressFor: () => complete,
      getCompletedOnFor: () => TODAY,
    });

    press("day-tab-custom");

    expect(
      screen.getByText("Genesis 21 is already recorded on this day."),
    ).toBeTruthy();
  });

  it('drops the "finishes the chapter" wording for something already finished', () => {
    renderDetail(makeDay(), {
      getProgressFor: () => complete,
      getCompletedOnFor: () => "2026-08-07",
    });

    press("day-tab-custom");

    expect(screen.getByText("34 (whole chapter)")).toBeTruthy();
    expect(screen.queryByText("34 (finishes the chapter)")).toBeNull();
    expect(screen.queryByText(/Stopping early/)).toBeNull();
  });

  it("still records when the reader really means to log it again", () => {
    const { onComplete } = renderDetail(makeDay(), {
      getProgressFor: () => complete,
      getCompletedOnFor: () => "2026-08-07",
    });

    press("day-tab-custom");
    press("log-custom-reading");

    expect(onComplete).toHaveBeenCalledWith([{ bookId: "GEN", chapter: 21 }], {
      from: 1,
      to: 34,
    });
  });
});

describe("DayDetail: removing a mistaken reading", () => {
  it("offers removal even while the chapter is unfinished", () => {
    // The reader who logged the wrong chapter for half a chapter had no way back: the
    // calendar showed the day complete while the sheet only offered to read on.
    const { onUndo } = renderDetail(
      makeDay({
        status: "completed",
        completedChapters: [{ bookId: "GEN", chapter: 21 }],
      }),
      { progress: progressFor([{ from: 1, to: 10 }]) },
    );

    expect(screen.getByTestId("mark-day-read")).toBeTruthy();
    press("undo-completion");
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it("does not claim a part-read chapter is completed", () => {
    // The label used to come from the *scheduled* chapter's progress, so a day holding a
    // half-read chapter showed a checkmark and "completed".
    const day = makeDay({
      status: "completed",
      completedChapters: [{ bookId: "GEN", chapter: 21 }],
    });
    const partial = progressFor([{ from: 1, to: 10 }]);
    renderDetail(day, {
      rows: [
        {
          id: "row-0",
          readingPlanId: "plan-1",
          localDate: day.date,
          bookId: "GEN",
          chapter: 21,
          verses: { from: 1, to: 10 },
          completedAt: 0,
        },
      ],
      progress: partial,
      getProgressFor: () => partial,
    });

    expect(screen.getByText("Genesis 21:1–10 recorded")).toBeTruthy();
    expect(screen.queryByText("Genesis 21 completed")).toBeNull();
  });

  it("reads completion from the rows when a day holds two chapters", () => {
    // A two-chapter day has no single `progress`, which used to resolve to "complete"
    // and label an unfinished pair as done.
    const day = makeDay({
      status: "completed",
      completedChapters: [
        { bookId: "GEN", chapter: 21 },
        { bookId: "LEV", chapter: 6 },
      ],
    });
    const partial = progressFor([{ from: 1, to: 10 }]);
    renderDetail(day, {
      progress: null,
      getProgressFor: (reference) =>
        reference.bookId === "GEN" ? partial : null,
    });

    expect(screen.queryByText(/completed/)).toBeNull();
  });

  it("labels a part-read chapter honestly on a day before the plan began", () => {
    // UnscheduledPanel passed `isComplete` as a constant. A before-plan day is the one
    // place that panel still renders with rows.
    const partial = progressFor([{ from: 1, to: 10 }]);
    renderDetail(
      makeDay({
        date: "2026-07-01",
        status: "completed",
        scheduled: { kind: "before-plan" },
        plan: null,
        completedChapters: [{ bookId: "GEN", chapter: 21 }],
      }),
      { getProgressFor: () => partial },
    );

    expect(screen.queryByText("Genesis 21 completed")).toBeNull();
  });

  it("removes a single entry from a day holding several", () => {
    const day = makeDay({
      status: "completed",
      completedChapters: [
        { bookId: "GEN", chapter: 1 },
        { bookId: "LEV", chapter: 6 },
      ],
    });
    const { onUndoEntry } = renderDetail(day);

    press("remove-entry-row-0");

    expect(onUndoEntry).toHaveBeenCalledWith("row-0");
  });
});

// The same gap Codex found on #16's account dialogs: Radix returns focus to a
// DialogTrigger, and these rows open their pickers themselves, so closing one dropped
// keyboard focus on the page body.
describe("DayDetail: pickers give focus back", () => {
  it.each([
    ["the verse row", "field-to-verse", false],
    ["the custom Book row", "custom-field-book", true],
    ["the custom Chapter row", "custom-field-chapter", true],
  ])("to %s when closed", async (_name, testId, custom) => {
    renderDetail(makeDay(), { progress: progressFor([]) });
    if (custom) press("day-tab-custom");
    const user = userEvent.setup();
    const row = screen.getByTestId(testId);

    row.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog")).toBeTruthy();
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(row);
  });
});
