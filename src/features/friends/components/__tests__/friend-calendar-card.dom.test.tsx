import { fireEvent, render, screen } from "@testing-library/react";

import { deriveReadingView } from "@/features/reading-plan/domain/reading-view";
import { ReadingViewProvider } from "@/features/reading-plan/hooks/reading-view-context";
import type { DateKey } from "@/utils/date-key";

import { FriendCalendarCard } from "../friend-profile/friend-calendar-card";

const EMPTY = { plans: [], activePlan: null, completions: [] };

function card(today: DateKey) {
  return (
    <ReadingViewProvider view={deriveReadingView(EMPTY, today)}>
      <FriendCalendarCard />
    </ReadingViewProvider>
  );
}

const month = (name: string) => screen.getByRole("heading", { level: 2, name });

describe("FriendCalendarCard when the friend's today moves on", () => {
  it("follows the friend's today into the new month", () => {
    const { rerender } = render(card("2026-10-31"));
    expect(month("October 2026")).toBeTruthy();

    rerender(card("2026-11-01"));

    expect(month("November 2026")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Jump to the current month" }),
    ).toBeNull();
  });

  it("stays on a month the viewer stepped to", () => {
    const { rerender } = render(card("2026-10-31"));
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));

    rerender(card("2026-11-01"));

    expect(month("September 2026")).toBeTruthy();
  });
});
