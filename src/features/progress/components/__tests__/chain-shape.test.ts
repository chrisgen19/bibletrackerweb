import {
  makeCompletions,
  makePlan,
} from "@/features/reading-plan/domain/__tests__/fixtures";
import {
  createScheduleContext,
  getDayReading,
} from "@/features/reading-plan/domain/schedule";
import type { DayReading } from "@/features/reading-plan/domain/types";
import { addDaysToDateKey, type DateKey } from "@/utils/date-key";

import { buildCalendarMonth } from "../../domain/calendar-month";
import { getChainShapes, getWeekChainShapes } from "../chain-shape";

const TODAY: DateKey = "2026-08-31";
const plan = makePlan({ startDate: "2026-07-01" });
// August 2026 starts on a Saturday: the 1st ends the first row, the 2nd starts the next.
const month = buildCalendarMonth({ year: 2026, month: 8 });

function readingsFor(completedDates: readonly DateKey[]) {
  const rows = makeCompletions(completedDates);
  const context = createScheduleContext([plan], rows, TODAY);
  return (date: DateKey) => getDayReading([plan], date, context);
}

function shapesFor(completedDates: readonly DateKey[]) {
  const read = readingsFor(completedDates);
  const readings = new Map<DateKey, DayReading>();
  for (const cell of month.weeks.flat())
    readings.set(cell.date, read(cell.date));
  return getChainShapes(month, readings);
}

describe("getChainShapes", () => {
  it("draws a lone read day as a circle", () => {
    expect(shapesFor(["2026-08-12"]).get("2026-08-12")).toEqual({
      left: "cap",
      right: "cap",
    });
  });

  it("joins consecutive days in a week into one band", () => {
    const shapes = shapesFor(["2026-08-11", "2026-08-12", "2026-08-13"]);
    expect(shapes.get("2026-08-11")).toEqual({ left: "cap", right: "link" });
    expect(shapes.get("2026-08-12")).toEqual({ left: "link", right: "link" });
    expect(shapes.get("2026-08-13")).toEqual({ left: "link", right: "cap" });
  });

  it("trails off where a run carries on into the next week", () => {
    const shapes = shapesFor(["2026-08-08", "2026-08-09"]);
    expect(shapes.get("2026-08-08")).toEqual({ left: "cap", right: "fade" });
    expect(shapes.get("2026-08-09")).toEqual({ left: "fade", right: "cap" });
  });

  it("trails off into the neighbouring month, which stays a circle", () => {
    const shapes = shapesFor(["2026-07-31", "2026-08-01"]);
    expect(shapes.get("2026-08-01")).toEqual({ left: "fade", right: "cap" });
    expect(shapes.get("2026-07-31")).toEqual({ left: "cap", right: "cap" });
  });

  it("leaves unread days out", () => {
    expect(shapesFor([]).size).toBe(0);
  });
});

describe("getWeekChainShapes", () => {
  // Sunday 23 to Saturday 29 August.
  function weekFor(completedDates: readonly DateKey[]) {
    const read = readingsFor(completedDates);
    return Array.from({ length: 7 }, (_, offset) =>
      read(addDaysToDateKey("2026-08-23", offset)),
    );
  }

  it("joins read days and leaves unread ones without a band", () => {
    const shapes = getWeekChainShapes(
      weekFor(["2026-08-24", "2026-08-25", "2026-08-27"]),
      { readBefore: false, readAfter: false },
    );
    expect(shapes).toEqual([
      undefined,
      { left: "cap", right: "link" },
      { left: "link", right: "cap" },
      undefined,
      { left: "cap", right: "cap" },
      undefined,
      undefined,
    ]);
  });

  it("trails off the strip's edges when the run carries on into the next week", () => {
    const shapes = getWeekChainShapes(weekFor(["2026-08-23", "2026-08-29"]), {
      readBefore: true,
      readAfter: true,
    });
    expect(shapes[0]).toEqual({ left: "fade", right: "cap" });
    expect(shapes[6]).toEqual({ left: "cap", right: "fade" });
  });
});
