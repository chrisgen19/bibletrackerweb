// Web-only (bibletrackerweb#18): createScheduleContext's `progressCompletions`, which keeps
// extra readings on the calendar but out of the plan. schedule.test.ts is the iOS port.
import {
  getReadThroughFinishDates,
  selectProgressCompletions,
} from "../read-through";
import { selectPlanReadings } from "../reading-kind";
import {
  calculateReadingForDate,
  calculateReadingStatus,
  createScheduleContext,
  isScheduledDay,
} from "../schedule";
import type { ReadingCompletion } from "../types";
import { makeCompletion, makePlan } from "./fixtures";
import {
  FIRST,
  FIRST_FINISHED,
  FIRST_RUN,
  SECOND,
} from "./read-through-fixtures";

const plan = makePlan({ startDate: "2026-10-01" });
const readings = [
  makeCompletion("2026-10-01", { id: "gen1", chapter: 1 }),
  makeCompletion("2026-10-02", {
    id: "rev5",
    bookId: "REV",
    chapter: 5,
    isExtra: true,
  }),
];

describe("createScheduleContext with progressCompletions", () => {
  const context = createScheduleContext(
    [plan],
    readings,
    "2026-10-03",
    undefined,
    selectPlanReadings(readings),
  );

  it("shows an extra reading on its day", () => {
    expect(context.byDate.has("2026-10-02")).toBe(true);
    expect(calculateReadingStatus(plan, "2026-10-02", context)).toBe(
      "completed",
    );
  });

  it("does not let an extra reading move the plan", () => {
    expect(context.unread[0]).toEqual({ bookId: "GEN", chapter: 2 });
    expect(context.completedKeys.has("REV:5")).toBe(false);
  });

  it("does not let an extra reading use up today's slot", () => {
    const today = createScheduleContext(
      [plan],
      readings,
      "2026-10-02",
      undefined,
      selectPlanReadings(readings),
    );
    expect(today.todayRecorded).toBe(false);
  });

  it("counts every row when no progress rows are given, as on iOS", () => {
    const all = createScheduleContext([plan], readings, "2026-10-03");
    expect(all.completedKeys.has("REV:5")).toBe(true);
  });
});

describe("a second read-through", () => {
  const plans = [FIRST, SECOND];

  /** The provider's view: progress counts read-through 2, finish lines are per read-through. */
  function contextOn(today: string, completions: readonly ReadingCompletion[]) {
    return {
      ...createScheduleContext(
        plans,
        completions,
        today,
        undefined,
        selectProgressCompletions(plans, completions, 2),
      ),
      finishedOnByReadThrough: getReadThroughFinishDates(plans, completions),
    };
  }

  it("starts from Genesis 1 again instead of reporting the Bible finished", () => {
    // Before read-throughs, this exact case scheduled nothing: every chapter was read.
    const context = contextOn("2027-06-01", FIRST_RUN);
    expect(context.unread[0]).toEqual({ bookId: "GEN", chapter: 1 });
    expect(calculateReadingForDate(SECOND, "2027-06-01", context)).toEqual({
      kind: "scheduled",
      chapters: [{ bookId: "GEN", chapter: 1 }],
    });
  });

  it("keeps the first read-through on the calendar", () => {
    const context = contextOn("2027-06-01", FIRST_RUN);
    expect(calculateReadingStatus(FIRST, "2024-01-01", context)).toBe(
      "completed",
    );
    expect(calculateReadingStatus(FIRST, FIRST_FINISHED, context)).toBe(
      "completed",
    );
  });

  it("leaves the days between finishing and starting again finished, not missed", () => {
    const context = contextOn("2027-06-01", FIRST_RUN);
    expect(calculateReadingStatus(FIRST, "2027-05-15", context)).toBe(
      "canon-complete",
    );
    // So they neither extend nor break a streak.
    expect(isScheduledDay(plans, "2027-05-15", context)).toBe(false);
  });

  it("lets a reading from the finished read-through use today's slot", () => {
    // Revelation 22 re-read against read-through 1 on the day read-through 2 began.
    const late = makeCompletion("2027-06-01", {
      id: "late",
      readingPlanId: "first",
      bookId: "REV",
      chapter: 22,
    });
    const context = contextOn("2027-06-01", [...FIRST_RUN, late]);
    expect(context.todayRecorded).toBe(true);
    expect(calculateReadingForDate(SECOND, "2027-06-02", context)).toEqual({
      kind: "scheduled",
      chapters: [{ bookId: "GEN", chapter: 1 }],
    });
  });
});
