import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";

import { getFriendReading } from "@/lib/friends-dal";

import InterceptedFriendDay from "../page";

vi.mock("@/lib/session", () => ({
  requireUser: async () => ({ id: "reader" }),
}));
vi.mock("@/lib/friends-dal", () => ({ getFriendReading: vi.fn() }));

const lookup = vi.mocked(getFriendReading);

async function renderSheet() {
  const page = await InterceptedFriendDay({
    params: Promise.resolve({ username: "maria", date: "2026-10-28" }),
  });
  return render(
    <QueryClientProvider client={new QueryClient()}>
      {page}
    </QueryClientProvider>,
  );
}

describe("the friend day sheet", () => {
  it("shows the unavailable state when the friendship has ended", async () => {
    lookup.mockResolvedValue({ kind: "not-found" });

    await renderSheet();

    expect(
      screen.getByRole("dialog", { name: "Profile unavailable" }),
    ).toBeTruthy();
    expect(screen.getByText("This profile isn't available")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Back to Friends" })
        .getAttribute("href"),
    ).toBe("/friends");
  });

  it("shows nothing for the reader's own day", async () => {
    lookup.mockResolvedValue({ kind: "self" });

    const { container } = await renderSheet();

    expect(container.textContent).toBe("");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
