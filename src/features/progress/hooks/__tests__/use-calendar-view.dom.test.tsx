import { act, renderHook } from "@testing-library/react";

import type { DateKey } from "@/utils/date-key";

import type { CalendarMode } from "../use-calendar-view";

// Thursday 29 October 2026.
const TODAY: DateKey = "2026-10-29";
const READER = "reader-a";
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
  const rendered = renderHook(() =>
    useCalendarView(TODAY, { readerId: READER, savedView, onRemember }),
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
      useCalendarView(TODAY, {
        readerId: READER,
        savedView: "week",
        onRemember: vi.fn(),
      }),
    );
    expect(again.result.current.mode).toBe("month");
  });

  it("never opens one reader's choice for the next reader in the same tab", async () => {
    const { result, unmount, useCalendarView } =
      await renderCalendarView("week");
    act(() => result.current.toggle());
    unmount();

    // Signing out and in as someone else navigates without reloading the page.
    const next = renderHook(() =>
      useCalendarView(TODAY, {
        readerId: "reader-b",
        savedView: "week",
        onRemember: vi.fn(),
      }),
    );
    expect(next.result.current.mode).toBe("week");
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

describe("across the breakpoint, as when a tablet turns", () => {
  it("keeps a desktop choice off the phone side", async () => {
    setDesktop(true);
    const { result, rerender } = await renderCalendarView("month");
    act(() => result.current.toggle());
    expect(result.current.mode).toBe("week");

    setDesktop(false);
    rerender();
    expect(result.current.mode).toBe("month");
  });

  it("keeps a phone choice off the desktop side, and back again", async () => {
    setDesktop(false);
    const { result, rerender } = await renderCalendarView("month");
    act(() => result.current.toggle());
    expect(result.current.mode).toBe("week");

    setDesktop(true);
    rerender();
    expect(result.current.mode).toBe("month");

    setDesktop(false);
    rerender();
    expect(result.current.mode).toBe("week");
  });
});

describe("when today moves on with the tab open", () => {
  async function renderAcrossMidnight(savedView: CalendarMode, from: DateKey) {
    vi.resetModules();
    const { useCalendarView } = await import("../use-calendar-view");
    return renderHook(
      ({ today }) =>
        useCalendarView(today, {
          readerId: READER,
          savedView,
          onRemember: vi.fn(),
        }),
      { initialProps: { today: from } },
    );
  }

  it("follows today into the new month", async () => {
    setDesktop(true);
    const { result, rerender } = await renderAcrossMidnight(
      "month",
      "2026-10-31",
    );

    rerender({ today: "2026-11-01" });

    expect(result.current.monthKey).toEqual({ year: 2026, month: 11 });
    expect(result.current.returnToToday).toBeUndefined();
  });

  it("follows today into the new week", async () => {
    setDesktop(false);
    // Saturday 31 October, then Sunday 1 November: a new week.
    const { result, rerender } = await renderAcrossMidnight(
      "week",
      "2026-10-31",
    );

    rerender({ today: "2026-11-01" });

    expect(result.current.weekStart).toBe("2026-11-01");
    expect(result.current.returnToToday).toBeUndefined();
  });

  it("stays on a month the reader stepped to", async () => {
    setDesktop(true);
    const { result, rerender } = await renderAcrossMidnight(
      "month",
      "2026-10-31",
    );
    act(() => result.current.step(-1));

    rerender({ today: "2026-11-01" });

    expect(result.current.monthKey).toEqual({ year: 2026, month: 9 });
    expect(result.current.returnToToday).toBeDefined();
  });
});
