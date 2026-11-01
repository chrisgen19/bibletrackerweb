// From bibletrackerapp's month-pager.test.tsx. iOS settles a native paging scroller at an
// offset; the web pager settles a pointer drag the same way: past half the width or on a
// flick it steps, otherwise it slides back. "Mounts only once a width is measured" has no
// web counterpart (CSS sizes the pages), and the arrow keys and the swallowed click after
// a drag are web additions.
import { fireEvent, render, screen } from "@testing-library/react";

import { makePlan } from "@/features/reading-plan/domain/__tests__/fixtures";
import {
  createCompletionLookup,
  createScheduleContext,
  getDayReading,
} from "@/features/reading-plan/domain/schedule";
import type { DayReading } from "@/features/reading-plan/domain/types";
import type { DateKey } from "@/utils/date-key";

import {
  addMonthsToMonthKey,
  buildCalendarMonth,
  type MonthKey,
} from "../../domain/calendar-month";
import { calculateMonthStatistics } from "../../domain/month-statistics";
import type { MonthProgress } from "../../hooks/use-month-progress";
import type { MonthWindow } from "../../hooks/use-month-window";
import { getGridHeight } from "../calendar-grid";
import { MonthPager } from "../month-pager";

const TODAY: DateKey = "2026-08-09";
const PLAN = makePlan({ startDate: "2026-07-20" });
const WIDTH = 390;

// jsdom has no layout; the pager measures its width when a drag ends.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => WIDTH,
  });
});
afterAll(() => {
  Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
});

function buildProgress(key: MonthKey): MonthProgress {
  const calendar = buildCalendarMonth(key);
  const completions = createCompletionLookup([]);
  const context = createScheduleContext([PLAN], [], TODAY);
  const readings = new Map<DateKey, DayReading>();
  for (const week of calendar.weeks) {
    for (const cell of week) {
      readings.set(cell.date, getDayReading([PLAN], cell.date, context));
    }
  }
  return {
    calendar,
    readings,
    statistics: calculateMonthStatistics({
      plans: [PLAN],
      completions,
      context,
      monthDates: calendar.monthDates,
      today: TODAY,
    }),
  };
}

function buildWindow(key: MonthKey): MonthWindow {
  return {
    previous: buildProgress(addMonthsToMonthKey(key, -1)),
    current: buildProgress(key),
    next: buildProgress(addMonthsToMonthKey(key, 1)),
  };
}

function renderPager(key: MonthKey = { year: 2026, month: 8 }) {
  const onStepMonth = vi.fn();
  const onSelectDay = vi.fn();
  render(
    <MonthPager
      window={buildWindow(key)}
      today={TODAY}
      onSelectDay={onSelectDay}
      onStepMonth={onStepMonth}
    />,
  );
  return { onStepMonth, onSelectDay };
}

const pager = () => screen.getByRole("region");
const track = () => pager().firstElementChild as HTMLElement;

/** A horizontal drag of `dx` pixels taking `ms`, released where it ends. */
function swipe(dx: number, ms: number) {
  const now = vi.spyOn(Date, "now");
  const at = (x: number) => ({
    clientX: 200 + x,
    clientY: 100,
    pointerId: 1,
    button: 0,
  });
  now.mockReturnValue(1_000);
  fireEvent.pointerDown(pager(), at(0));
  now.mockReturnValue(1_000 + ms / 2);
  fireEvent.pointerMove(pager(), at(dx / 2));
  now.mockReturnValue(1_000 + ms);
  fireEvent.pointerMove(pager(), at(dx));
  fireEvent.pointerUp(pager(), at(dx));
  now.mockRestore();
}

/** The slide to the neighbour (or back) finishing. */
const settle = () => fireEvent.transitionEnd(track());

describe("MonthPager", () => {
  it("advances a month when the swipe settles on the right-hand page", () => {
    const { onStepMonth } = renderPager();

    swipe(-WIDTH * 0.9, 1_500);
    settle();

    expect(onStepMonth).toHaveBeenCalledWith(1);
  });

  it("goes back a month when the swipe settles on the left-hand page", () => {
    const { onStepMonth } = renderPager();

    swipe(WIDTH * 0.9, 1_500);
    settle();

    expect(onStepMonth).toHaveBeenCalledWith(-1);
  });

  it("does nothing when the swipe settles back on the centre page", () => {
    const { onStepMonth } = renderPager();

    swipe(-WIDTH * 0.1, 1_500);
    settle();

    expect(onStepMonth).not.toHaveBeenCalled();
  });

  it("rounds a partial swipe to the nearest page", () => {
    const { onStepMonth } = renderPager();

    // Dragged most of the way to the next page.
    swipe(-WIDTH * 0.7, 1_500);
    settle();
    expect(onStepMonth).toHaveBeenCalledWith(1);
  });

  it("ignores a partial swipe that falls back toward the centre", () => {
    const { onStepMonth } = renderPager();

    swipe(-WIDTH * 0.3, 1_500);
    settle();
    expect(onStepMonth).not.toHaveBeenCalled();
  });

  it("steps only once per settle", () => {
    const { onStepMonth } = renderPager();

    swipe(-WIDTH * 0.9, 1_500);
    settle();
    settle();

    expect(onStepMonth).toHaveBeenCalledTimes(1);
  });

  it("changes month on a short, quick flick", () => {
    const { onStepMonth } = renderPager();

    swipe(-60, 100);
    settle();

    expect(onStepMonth).toHaveBeenCalledWith(1);
  });

  it("changes month with the arrow keys while the calendar has focus", () => {
    const { onStepMonth } = renderPager();

    fireEvent.keyDown(pager(), { key: "ArrowRight" });
    fireEvent.keyDown(pager(), { key: "ArrowLeft" });

    expect(onStepMonth.mock.calls).toEqual([[1], [-1]]);
  });

  it("leaves the arrow keys alone inside a day", () => {
    const { onStepMonth } = renderPager();

    fireEvent.keyDown(screen.getByLabelText(/^Today, /), { key: "ArrowRight" });

    expect(onStepMonth).not.toHaveBeenCalled();
  });

  describe("height", () => {
    // Sundays first: Aug 2026 has 6 rows, Sep and Oct have 5, Jun has 5 and May has 6.
    const SEPTEMBER = { year: 2026, month: 9 };
    const JUNE = { year: 2026, month: 6 };
    const height = () => pager().style.height;

    /** A drag held at `dx`, not yet released. */
    function drag(dx: number) {
      const at = (x: number) => ({
        clientX: 200 + x,
        clientY: 100,
        pointerId: 1,
        button: 0,
      });
      fireEvent.pointerDown(pager(), at(0));
      fireEvent.pointerMove(pager(), at(dx));
    }

    it("fits the month at rest, even next to a taller one", () => {
      renderPager(SEPTEMBER);

      expect(height()).toBe(`${getGridHeight(5)}px`);
    });

    it("grows while dragging toward a taller month, so its last row is not clipped", () => {
      renderPager(SEPTEMBER);

      drag(100);

      expect(height()).toBe(`${getGridHeight(6)}px`);
    });

    it("ignores the taller month on the side not being dragged toward", () => {
      renderPager(SEPTEMBER);

      drag(-100);

      expect(height()).toBe(`${getGridHeight(5)}px`);
    });

    it("stays tall while the slide onto a taller month finishes", () => {
      renderPager(SEPTEMBER);

      swipe(WIDTH * 0.9, 1_500);

      expect(height()).toBe(`${getGridHeight(6)}px`);
    });

    it("keeps the current month's height while dragging toward a shorter one", () => {
      renderPager({ year: 2026, month: 5 });

      drag(-100);

      expect(height()).toBe(`${getGridHeight(6)}px`);
    });

    it("returns to the month's height after sliding back", () => {
      renderPager(JUNE);

      swipe(WIDTH * 0.1, 1_500);
      settle();

      expect(height()).toBe(`${getGridHeight(5)}px`);
    });
  });

  it("does not open the day a swipe ends on", () => {
    const { onSelectDay } = renderPager();
    const today = screen.getByLabelText(/^Today, /);

    swipe(-WIDTH * 0.3, 1_500);
    fireEvent.click(today);
    expect(onSelectDay).not.toHaveBeenCalled();

    // Only that one click: the next tap opens the day as usual.
    fireEvent.click(today);
    expect(onSelectDay).toHaveBeenCalledWith(TODAY);
  });
});
