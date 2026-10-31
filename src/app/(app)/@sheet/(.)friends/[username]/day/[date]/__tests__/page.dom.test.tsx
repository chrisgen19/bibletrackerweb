import {
  focusManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { act } from "react";

import type { FriendReadingLookup } from "@/features/friends/domain/types";
import { getFriendReading } from "@/lib/friends-dal";

import InterceptedFriendDay from "../page";

vi.mock("@/lib/session", () => ({
  requireUser: async () => ({ id: "reader" }),
}));
vi.mock("@/lib/friends-dal", () => ({ getFriendReading: vi.fn() }));

const lookup = vi.mocked(getFriendReading);

const FRIEND: FriendReadingLookup = {
  kind: "friend",
  profile: { userId: "u-maria", username: "maria", name: "Maria", image: null },
  reading: {
    snapshot: { plans: [], activePlan: null, completions: [] },
    today: "2026-10-31",
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  focusManager.setFocused(undefined);
});

async function renderSheet(date = "2026-10-28") {
  const page = await InterceptedFriendDay({
    params: Promise.resolve({ username: "maria", date }),
    searchParams: Promise.resolve({}),
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

  it("keeps the dialog named when the friendship ends while it is open", async () => {
    lookup.mockResolvedValue(FRIEND);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "not-found" }, { status: 404 })),
    );
    await renderSheet();
    expect(
      screen.getByRole("dialog", { name: "28 October 2026" }),
    ).toBeTruthy();

    act(() => focusManager.setFocused(false));
    act(() => focusManager.setFocused(true));

    expect(
      await screen.findByText("This profile isn't available"),
    ).toBeTruthy();
    expect(
      screen.getByRole("dialog", { name: "Profile unavailable" }),
    ).toBeTruthy();
  });

  it("names the dialog for a date that does not exist", async () => {
    lookup.mockResolvedValue(FRIEND);

    await renderSheet("2026-13-45");

    expect(
      screen.getByRole("dialog", { name: "Day unavailable" }),
    ).toBeTruthy();
    expect(screen.getByText("That day isn't available")).toBeTruthy();
  });

  it("shows nothing for the reader's own day", async () => {
    lookup.mockResolvedValue({ kind: "self" });

    const { container } = await renderSheet();

    expect(container.textContent).toBe("");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
