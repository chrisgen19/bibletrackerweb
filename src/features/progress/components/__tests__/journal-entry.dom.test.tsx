import { render, screen } from "@testing-library/react";

import { deriveReadingView } from "@/features/reading-plan/domain/reading-view";
import { ReadingViewProvider } from "@/features/reading-plan/hooks/reading-view-context";
import type { DateKey } from "@/utils/date-key";

import type { JournalEntry } from "../../domain/reading-journal";
import { JournalEntryRow } from "../journal-entry";

const TODAY: DateKey = "2026-10-30";
const view = deriveReadingView(
  { plans: [], activePlan: null, completions: [] },
  TODAY,
);

const readEntry: JournalEntry = {
  kind: "read",
  date: "2026-10-28",
  passage: "Genesis 1",
  extras: null,
  above: "none",
  below: "none",
};

const todayEntry: JournalEntry = {
  kind: "today",
  date: TODAY,
  next: "Genesis 2",
  below: "none",
};

describe("JournalEntryRow links", () => {
  it("links a day to /day/<date> by default", () => {
    render(
      <ReadingViewProvider view={view}>
        <JournalEntryRow entry={readEntry} today={TODAY} />
        <JournalEntryRow entry={todayEntry} today={TODAY} />
      </ReadingViewProvider>,
    );

    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/day/2026-10-28", `/day/${TODAY}`]);
  });

  it("links a day to /day/<date> without any provider", () => {
    render(<JournalEntryRow entry={readEntry} today={TODAY} />);

    expect(screen.getByRole("link").getAttribute("href")).toBe(
      "/day/2026-10-28",
    );
  });

  it("links a day through the provider's dayHref", () => {
    render(
      <ReadingViewProvider
        view={view}
        dayHref={(date) => `/friends/maria/day/${date}`}
      >
        <JournalEntryRow entry={readEntry} today={TODAY} />
        <JournalEntryRow entry={todayEntry} today={TODAY} />
      </ReadingViewProvider>,
    );

    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([
      "/friends/maria/day/2026-10-28",
      `/friends/maria/day/${TODAY}`,
    ]);
  });
});
