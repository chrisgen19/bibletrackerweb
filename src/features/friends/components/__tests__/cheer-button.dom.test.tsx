import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";

import {
  makeCompletion,
  makePlan,
} from "@/features/reading-plan/domain/__tests__/fixtures";

import type { FriendProfile, FriendReading } from "../../domain/types";
import { FriendReadingProvider } from "../../hooks/friend-reading-provider";
import { FriendTodayCard } from "../friend-profile/friend-today-card";

const actions = vi.hoisted(() => ({ nudgeFriend: vi.fn() }));
vi.mock("@/actions/friends", () => actions);

const MARIA: FriendProfile = {
  userId: "user-maria",
  username: "maria",
  name: "Maria",
  image: null,
};
const PLAN = makePlan({ startDate: "2026-10-01" });
const NETWORK = "Couldn't save that. Check your connection and try again.";

const NOT_READ: FriendReading = {
  snapshot: { plans: [PLAN], activePlan: PLAN, completions: [] },
  today: "2026-10-31",
  nudgedToday: false,
};

function renderCard(initial: FriendReading = NOT_READ) {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <FriendReadingProvider username="maria" initial={initial}>
        <FriendTodayCard profile={MARIA} />
      </FriendReadingProvider>
    </QueryClientProvider>,
  );
  return client;
}

const cheerButton = () =>
  screen.queryByRole("button", { name: /Cheer Maria on/ });

beforeEach(() => {
  actions.nudgeFriend.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(NOT_READ))),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("CheerButton", () => {
  it('shows "Cheer Maria on" while the friend has not read', () => {
    renderCard();
    expect(cheerButton()).not.toBeNull();
  });

  it("hides the button once the friend has read today", () => {
    renderCard({
      ...NOT_READ,
      snapshot: {
        ...NOT_READ.snapshot,
        completions: [makeCompletion("2026-10-31", { chapter: 1 })],
      },
    });
    expect(cheerButton()).toBeNull();
    expect(screen.queryByText(/You cheered/)).toBeNull();
  });

  it("shows the confirmation when the server says already nudged", () => {
    renderCard({ ...NOT_READ, nudgedToday: true });
    expect(screen.getByText("You cheered Maria on today")).toBeTruthy();
    expect(cheerButton()).toBeNull();
  });

  it("switches to the confirmation at once and sends one request on a double tap", () => {
    actions.nudgeFriend.mockReturnValue(new Promise(() => {}));
    renderCard();
    const button = cheerButton() as HTMLElement;

    // Both taps land before React re-renders (one act batch), so the button is still
    // mounted for the second one and its handler runs twice. Only the in-flight guard
    // stops a second request; the swap to the confirmation cannot.
    act(() => {
      button.click();
      button.click();
    });

    expect(screen.getByText("You cheered Maria on today")).toBeTruthy();
    expect(actions.nudgeFriend).toHaveBeenCalledTimes(1);
    expect(actions.nudgeFriend).toHaveBeenCalledWith({ userId: "user-maria" });
  });

  it("reverts with an error when sending fails", async () => {
    actions.nudgeFriend.mockRejectedValue(new Error("offline"));
    renderCard();

    await act(async () => {
      fireEvent.click(cheerButton() as HTMLElement);
    });

    expect(cheerButton()).not.toBeNull();
    expect(screen.getByText(NETWORK)).toBeTruthy();
  });

  it("keeps the confirmation without an error for already-nudged", async () => {
    actions.nudgeFriend.mockResolvedValue({
      ok: false,
      error: "already-nudged",
    });
    renderCard();

    await act(async () => {
      fireEvent.click(cheerButton() as HTMLElement);
    });

    expect(screen.getByText("You cheered Maria on today")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(fetch).toHaveBeenCalled();
  });

  it("switches the card to the reading when the friend already read", async () => {
    actions.nudgeFriend.mockResolvedValue({ ok: false, error: "already-read" });
    const READ: FriendReading = {
      ...NOT_READ,
      snapshot: {
        ...NOT_READ.snapshot,
        completions: [makeCompletion("2026-10-31")],
      },
    };
    renderCard();
    // The refresh the rejection triggers finds the friend's completion for today.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(READ))),
    );

    await act(async () => {
      fireEvent.click(cheerButton() as HTMLElement);
    });

    expect(await screen.findByText(/^Read today:/)).toBeTruthy();
    expect(cheerButton()).toBeNull();
  });

  it("shows the button again when the friend's day moves on", async () => {
    actions.nudgeFriend.mockResolvedValue({ ok: true });
    const NEXT_DAY = { ...NOT_READ, today: "2026-11-01" };
    renderCard();
    expect(cheerButton()).not.toBeNull();
    // The refresh the send triggers finds the friend on their next day.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(NEXT_DAY))),
    );
    await act(async () => {
      fireEvent.click(cheerButton() as HTMLElement);
    });
    await screen.findByText(
      "Missed the last 31 days · 0 day streak · longest 0",
    );

    expect(cheerButton()).not.toBeNull();
  });

  it("uses no warning colours", () => {
    actions.nudgeFriend.mockReturnValue(new Promise(() => {}));
    renderCard();
    const button = cheerButton() as HTMLElement;
    // Ignore the shared Button's own aria-invalid variants; check what this feature adds.
    expect(button.querySelector("[class*='destructive']")).toBeNull();
    fireEvent.click(cheerButton() as HTMLElement);
    const confirmation = screen.getByText("You cheered Maria on today");
    expect(confirmation.parentElement?.className).not.toContain("destructive");
  });
});
