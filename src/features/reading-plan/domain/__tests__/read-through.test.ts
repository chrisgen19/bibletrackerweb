// Web-only (bibletrackerweb#18): read-throughs are not in bibletrackerapp yet.
import { getChapterProgress } from "../chapter-progress";
import {
  buildNextReadThroughDraft,
  getCurrentReadThrough,
  getReadThrough,
  getReadThroughFinishDates,
  getRecordedReadThrough,
  isCurrentReadThroughFinished,
  selectProgressCompletions,
} from "../read-through";
import { makeCompletion, makePlan } from "./fixtures";
import {
  FIRST_FINISHED,
  FIRST as first,
  FIRST_RUN as firstRun,
  SECOND as second,
} from "./read-through-fixtures";

describe("getReadThrough / getCurrentReadThrough", () => {
  it("treats a plan without one (every iOS plan) as the first", () => {
    expect(getReadThrough(makePlan())).toBe(1);
  });

  it("follows the active plan", () => {
    expect(getCurrentReadThrough([first, second], second)).toBe(2);
  });

  it("falls back to the latest read-through without an active plan", () => {
    expect(
      getCurrentReadThrough([first, { ...second, isActive: false }], null),
    ).toBe(2);
    expect(getCurrentReadThrough([], null)).toBe(1);
  });
});

describe("selectProgressCompletions", () => {
  it("keeps the read-through's own plan readings only", () => {
    const rows = [
      makeCompletion("2027-04-03", { id: "old", readingPlanId: "first" }),
      makeCompletion("2027-06-01", { id: "new", readingPlanId: "second" }),
      makeCompletion("2027-06-01", {
        id: "extra",
        readingPlanId: "second",
        bookId: "REV",
        isExtra: true,
      }),
    ];
    const ids = (readThrough: number) =>
      selectProgressCompletions([first, second], rows, readThrough).map(
        (row) => row.id,
      );
    expect(ids(1)).toEqual(["old"]);
    expect(ids(2)).toEqual(["new"]);
  });
});

describe("getReadThroughFinishDates", () => {
  it("dates a finished read-through by the chapter that closed it", () => {
    const finished = getReadThroughFinishDates([first, second], firstRun);
    expect(finished.get(1)).toBe(FIRST_FINISHED);
    expect(finished.has(2)).toBe(false);
  });

  it("does not count a read-through with a chapter left", () => {
    const missingOne = firstRun.slice(0, -1);
    expect(getReadThroughFinishDates([first], missingOne).size).toBe(0);
  });

  it("finishes a first read-through that began mid-canon at its own start", () => {
    // Onboarded at Revelation 22: reading it finishes the plan, as the app says today.
    const late = makePlan({ startBookId: "REV", startChapter: 22 });
    const rows = [makeCompletion("2026-08-01", { bookId: "REV", chapter: 22 })];
    expect(getReadThroughFinishDates([late], rows).get(1)).toBe("2026-08-01");
  });

  it("ignores extra readings", () => {
    const late = makePlan({ startBookId: "REV", startChapter: 22 });
    const rows = [
      makeCompletion("2026-08-01", {
        bookId: "REV",
        chapter: 22,
        isExtra: true,
      }),
    ];
    expect(getReadThroughFinishDates([late], rows).size).toBe(0);
  });
});

describe("isCurrentReadThroughFinished", () => {
  it("is true once the active plan's read-through is finished", () => {
    const active = { ...first, isActive: true, endDate: null };
    expect(isCurrentReadThroughFinished([active], active, firstRun)).toBe(true);
  });

  it("is false for a new read-through that has only begun", () => {
    expect(
      isCurrentReadThroughFinished([first, second], second, firstRun),
    ).toBe(false);
  });

  it("is false without an active plan", () => {
    expect(isCurrentReadThroughFinished([first], null, firstRun)).toBe(false);
  });
});

describe("buildNextReadThroughDraft", () => {
  it("starts again at Genesis 1 on the given day, at the same pace", () => {
    const plan = makePlan({
      startBookId: "MAT",
      startChapter: 5,
      chaptersPerDay: 3,
    });
    expect(buildNextReadThroughDraft(plan, "2027-06-01")).toEqual({
      canonId: "protestant",
      startDate: "2027-06-01",
      startBookId: "GEN",
      startChapter: 1,
      chaptersPerDay: 3,
    });
  });
});

describe("getRecordedReadThrough", () => {
  // Read-through 2 started on the day read-through 1 finished, with Revelation 22.
  const restart = { ...second, startDate: FIRST_FINISHED };
  const plans = [first, restart];
  const REVELATION_22 = { bookId: "REV", chapter: 22 };
  const finishingDay = firstRun.filter(
    (row) => row.localDate === FIRST_FINISHED,
  );

  it("is the read-through a chapter on the day was recorded in", () => {
    expect(getRecordedReadThrough(plans, finishingDay, REVELATION_22)).toBe(1);
  });

  it("keeps the chapter that finished read-through 1 finished on the day 2 starts", () => {
    const measuredIn = (readThrough: number) =>
      getChapterProgress(
        selectProgressCompletions(plans, firstRun, readThrough),
        REVELATION_22,
      )?.isComplete;

    const recorded = getRecordedReadThrough(plans, finishingDay, REVELATION_22);
    expect(measuredIn(recorded ?? getReadThrough(restart))).toBe(true);
    // Measured in the read-through governing the day, it read as unread.
    expect(measuredIn(getReadThrough(restart))).toBe(false);
  });

  it("is null for a chapter the day holds no reading of", () => {
    expect(
      getRecordedReadThrough(plans, finishingDay, {
        bookId: "GEN",
        chapter: 1,
      }),
    ).toBeNull();
  });
});
