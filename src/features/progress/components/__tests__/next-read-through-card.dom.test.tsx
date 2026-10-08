// Web-only (bibletrackerweb#18): starting the next read-through.
import { fireEvent, render, screen } from "@testing-library/react";

import { NextReadThroughCard } from "../next-read-through-card";

function renderCard() {
  const onStart = vi.fn();
  render(<NextReadThroughCard nextReadThrough={2} onStart={onStart} />);
  return { onStart };
}

const press = (testId: string) => fireEvent.click(screen.getByTestId(testId));

describe("NextReadThroughCard", () => {
  it("offers the next read-through by number", () => {
    renderCard();
    expect(screen.getByTestId("start-next-read-through").textContent).toBe(
      "Start Read-Through #2",
    );
  });

  it("asks before starting, and starts on confirm", () => {
    const { onStart } = renderCard();

    press("start-next-read-through");
    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toContain("Start read-through #2?");
    expect(dialog.textContent).toContain("stays on your calendar");
    expect(onStart).not.toHaveBeenCalled();

    press("confirm-next-read-through");
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the reader is not ready yet", () => {
    const { onStart } = renderCard();
    press("start-next-read-through");
    fireEvent.click(screen.getByText("Not yet"));
    expect(onStart).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});
