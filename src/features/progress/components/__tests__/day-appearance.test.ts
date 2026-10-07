// From bibletrackerapp's day-appearance.test.ts. The web returns colour roles rather than
// colours, so "the accent colour" is the on-primary numeral over the bloom fill, and
// "never the danger colour" holds by construction: no role names it.
import type { DayReading } from "@/features/reading-plan/domain/types";

import { describeDay, getDayAppearance } from "../day-appearance";

const OPTIONS = { isToday: false, inCurrentMonth: true };

describe("getDayAppearance", () => {
  it("fills completed days with the accent colour", () => {
    const appearance = getDayAppearance("completed", OPTIONS);
    expect(appearance.text).toBe("on-primary");
    expect(appearance.weight).toBe("semibold");
  });

  it("outlines today when it is still pending", () => {
    const appearance = getDayAppearance("today-pending", {
      ...OPTIONS,
      isToday: true,
    });
    expect(appearance.ring).toBe(true);
    expect(appearance.text).toBe("primary");
    expect(appearance.fill).toBe("none");
  });

  it("still marks today when it has been completed", () => {
    const appearance = getDayAppearance("completed", {
      ...OPTIONS,
      isToday: true,
    });
    expect(appearance.text).toBe("on-primary");
    expect(appearance.ring).toBe(true);
  });

  it("treats missed days neutrally, never with the danger colour", () => {
    const appearance = getDayAppearance("missed", OPTIONS);
    expect(appearance.fill).toBe("muted");
    expect(appearance.text).toBe("tertiary");
    expect(appearance.ring).toBe(false);
  });

  it("lowers contrast for future and out-of-month days", () => {
    const upcoming = getDayAppearance("upcoming", OPTIONS);
    expect(upcoming.text).toBe("tertiary");

    const outside = getDayAppearance("upcoming", {
      ...OPTIONS,
      inCurrentMonth: false,
    });
    expect(outside.opacity).toBeLessThan(upcoming.opacity);
  });
});

describe("describeDay", () => {
  const day: DayReading = {
    date: "2026-08-24",
    status: "completed",
    scheduled: {
      kind: "scheduled",
      chapters: [{ bookId: "GEN", chapter: 24 }],
    },
    completedChapters: [{ bookId: "GEN", chapter: 24 }],
    plan: null,
  };

  it("reads a full sentence for screen readers", () => {
    expect(describeDay(day, false)).toBe(
      "Monday 24 August, Genesis 24, completed",
    );
  });

  it("announces today explicitly", () => {
    expect(describeDay(day, true)).toBe(
      "Today, Monday 24 August, Genesis 24, completed",
    );
  });

  it("omits a reference when nothing is scheduled", () => {
    expect(
      describeDay(
        { ...day, status: "before-plan", scheduled: { kind: "before-plan" } },
        false,
      ),
    ).toBe("Monday 24 August, before your plan began");
  });
});
