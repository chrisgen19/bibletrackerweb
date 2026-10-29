import { fireEvent, render, screen } from "@testing-library/react";

import {
  makeCompletions,
  makePlan,
} from "@/features/reading-plan/domain/__tests__/fixtures";
import {
  createScheduleContext,
  getDayReading,
} from "@/features/reading-plan/domain/schedule";
import { addDaysToDateKey, type DateKey } from "@/utils/date-key";

import { WeekStrip } from "../week-strip";

// Monday. The week strip runs Sunday 23 to Saturday 29 August.
const TODAY: DateKey = "2026-08-24";
const plan = makePlan({ startDate: "2026-08-01" });

function renderStrip(
  completedDates: readonly DateKey[],
  onSelectDay = vi.fn(),
) {
  const rows = makeCompletions(completedDates);
  const context = createScheduleContext([plan], rows, TODAY);
  const days = Array.from({ length: 7 }, (_, offset) =>
    getDayReading([plan], addDaysToDateKey("2026-08-23", offset), context),
  );
  return render(
    <WeekStrip days={days} today={TODAY} onSelectDay={onSelectDay} />,
  );
}

describe("WeekStrip", () => {
  it("shows one day per pill, each describing itself", () => {
    renderStrip(["2026-08-23"]);

    expect(screen.getAllByRole("button")).toHaveLength(7);
    expect(
      screen.getByLabelText("Sunday 23 August, Genesis 1, completed"),
    ).toBeTruthy();
    expect(
      screen
        .getByLabelText("Today, Monday 24 August, Genesis 2, not read yet")
        .getAttribute("aria-current"),
    ).toBe("date");
  });

  it("opens the day when a pill is tapped", () => {
    const onSelectDay = vi.fn();
    renderStrip([], onSelectDay);

    fireEvent.click(
      screen.getByLabelText("Tuesday 25 August, Genesis 2, scheduled"),
    );
    expect(onSelectDay).toHaveBeenCalledWith("2026-08-25");
  });
});
