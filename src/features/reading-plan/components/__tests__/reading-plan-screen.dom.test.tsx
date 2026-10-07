// Review on #10: the reading plan screen opened on the plan segment's first chapter, so
// "Current position: Genesis 5" in Settings led to fields reading Genesis 1.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  readerPartWayThrough,
  readerWithOnlyAnExtraToday,
} from "@/test/reading-scenarios";

import { ReadingPlanScreen } from "../reading-plan-screen";

const scenario = vi.hoisted(() => ({ onlyAnExtraToday: false }));

vi.mock("@/features/reading-plan/hooks/reading-data-provider", () => ({
  useReadingData: () => ({
    ...(scenario.onlyAnExtraToday
      ? readerWithOnlyAnExtraToday()
      : readerPartWayThrough()),
    changePlan: vi.fn(),
  }),
}));

afterEach(() => {
  scenario.onlyAnExtraToday = false;
});

describe("ReadingPlanScreen", () => {
  it("opens on where the reader is", () => {
    render(<ReadingPlanScreen />);

    expect(screen.getByRole("button", { name: /^Book/ }).textContent).toContain(
      "Genesis",
    );
    expect(screen.getByRole("button", { name: /^Chapter/ }).textContent).toBe(
      "Chapter5",
    );
  });

  // The same gap Codex found on #16's account dialogs: Radix returns focus to a
  // DialogTrigger, and these rows open their pickers themselves, so closing one dropped
  // keyboard focus on the page body.
  it.each([
    "Book",
    "Chapter",
  ])("gives focus back to the %s row when its picker closes", async (label) => {
    render(<ReadingPlanScreen />);
    const user = userEvent.setup();
    const row = screen.getByRole("button", { name: new RegExp(`^${label},`) });

    row.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog")).toBeTruthy();
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(row);
  });

  it("gives focus back to the Book row once a book is chosen", async () => {
    render(<ReadingPlanScreen />);
    const user = userEvent.setup();
    const row = screen.getByRole("button", { name: /^Book,/ });

    await user.click(row);
    await user.click(screen.getByRole("option", { name: /^Exodus,/ }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(row.textContent).toContain("Exodus");
    expect(document.activeElement).toBe(row);
  });

  // Review on #19 (Codex): the screen read the calendar's context, so a day holding only
  // an extra reading showed that extra as today's reading.
  it("shows the plan's chapter as today's reading, not an extra", () => {
    scenario.onlyAnExtraToday = true;
    render(<ReadingPlanScreen />);

    const today = screen.getByText("READING TODAY").parentElement;
    expect(today?.textContent).toContain("Genesis 5");
    expect(today?.textContent).not.toContain("Revelation 5");
  });
});
