import { act, renderHook } from "@testing-library/react";

import type { DateKey } from "@/utils/date-key";

import type { CalendarMode } from "../use-calendar-view";

// Thursday 29 October 2026.
const TODAY: DateKey = "2026-10-29";
const originalMatchMedia = window.matchMedia;

/** A viewport either side of the desktop breakpoint. */
function setDesktop(desktop: boolean) {
  window.matchMedia = ((query: string) => ({
    ...originalMatchMedia(query),
    matches: desktop && query === "(min-width: 1024px)",
  })) as typeof window.matchMedia;
}

// The hook remembers a choice for the rest of the visit in module state, so each test
// gets a fresh module: a fresh visit.
async function renderCalendarView(savedView: CalendarMode) {
  vi.resetModules();
  const { useCalendarView } = await import("../use-calendar-view");
  const onRemember = vi.fn();
  const rendered = renderHook(
    ({ saved }: { saved: CalendarMode }) =>
      useCalendarView(TODAY, { savedView: saved, onRemember }),
    { initialProps: { saved: savedView } },
  );
  return { ...rendered, onRemember, useCalendarView };
}

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe("on a phone", () => {
  beforeEach(() => setDesktop(false));

  it("opens on the view saved to the account", async () => {
    expect((await renderCalendarView("week")).result.current.mode).toBe("week");
    expect((await renderCalendarView("month")).result.current.mode).toBe(
      "month",
    );
  });

  it("saves each switch to the account", async () => {
    const { result, onRemember } = await renderCalendarView("week");

    act(() => result.current.toggle());
    expect(result.current.mode).toBe("month");
    expect(onRemember).toHaveBeenLastCalledWith("month");

    act(() => result.current.toggle());
    expect(onRemember).toHaveBeenLastCalledWith("week");
  });

  it("keeps the choice for the rest of the visit, over a stale saved view", async () => {
    const { result, useCalendarView } = await renderCalendarView("week");
    act(() => result.current.toggle());

    // Coming back to the home screen with a page rendered before the choice was stored.
    const again = renderHook(() =>
      useCalendarView(TODAY, { savedView: "week", onRemember: vi.fn() }),
    );
    expect(again.result.current.mode).toBe("month");
  });

  it("lets CSS show the month on a wider screen until the reader chooses", async () => {
    const { result } = await renderCalendarView("week");
    expect(result.current.followsWidth).toBe(true);

    act(() => result.current.toggle());
    act(() => result.current.toggle());
    expect(result.current.mode).toBe("week");
    expect(result.current.followsWidth).toBe(false);
  });
});

describe("on desktop", () => {
  beforeEach(() => setDesktop(true));

  it("opens on the month whatever a phone saved", async () => {
    const { result } = await renderCalendarView("week");
    expect(result.current.mode).toBe("month");
    expect(result.current.followsWidth).toBe(false);
  });

  it("switches for this visit without saving it", async () => {
    const { result, onRemember } = await renderCalendarView("week");

    act(() => result.current.toggle());
    expect(result.current.mode).toBe("week");
    expect(onRemember).not.toHaveBeenCalled();
  });
});
