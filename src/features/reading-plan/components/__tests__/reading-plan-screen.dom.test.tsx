// Review on #10: the reading plan screen opened on the plan segment's first chapter, so
// "Current position: Genesis 5" in Settings led to fields reading Genesis 1.
import { render, screen } from "@testing-library/react";

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
});
