// Review on #10: the reading plan screen opened on the plan segment's first chapter, so
// "Current position: Genesis 5" in Settings led to fields reading Genesis 1.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { readerPartWayThrough } from "@/test/reading-scenarios";

import { ReadingPlanScreen } from "../reading-plan-screen";

vi.mock("@/features/reading-plan/hooks/reading-data-provider", () => ({
  useReadingData: () => ({ ...readerPartWayThrough(), changePlan: vi.fn() }),
}));

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
});
