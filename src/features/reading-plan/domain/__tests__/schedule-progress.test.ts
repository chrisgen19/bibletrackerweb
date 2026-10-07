// Web-only (bibletrackerweb#18): createScheduleContext's `progressCompletions`, which keeps
// extra readings on the calendar but out of the plan. schedule.test.ts is the iOS port.
import { selectPlanReadings } from "../reading-kind";
import { calculateReadingStatus, createScheduleContext } from "../schedule";
import { makeCompletion, makePlan } from "./fixtures";

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
