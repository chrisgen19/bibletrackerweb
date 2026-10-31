import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";

import {
  makeCompletion,
  makePlan,
} from "@/features/reading-plan/domain/__tests__/fixtures";
import { router } from "@/test/dom-setup";

import type { FriendProfile, FriendReading } from "../../domain/types";
import { FriendProfileScreen } from "../friend-profile/friend-profile-screen";

const MARIA: FriendProfile = {
  userId: "user-maria",
  username: "maria",
  name: "Maria",
  image: null,
};

const PLAN = makePlan({ startDate: "2026-10-01" });

/** Oct 1 to 30 read except the 15th, so the friend is a day short of today. */
const COMPLETIONS = Array.from({ length: 30 }, (_, i) => i + 1)
  .filter((day) => day !== 15)
  .map((day) =>
    makeCompletion(`2026-10-${String(day).padStart(2, "0")}`, {
      chapter: day,
    }),
  );

const READING: FriendReading = {
  snapshot: { plans: [PLAN], activePlan: PLAN, completions: COMPLETIONS },
  today: "2026-10-31",
};

const NO_PLAN: FriendReading = {
  snapshot: { plans: [], activePlan: null, completions: [] },
  today: "2026-10-31",
};

const NO_READINGS: FriendReading = {
  snapshot: { plans: [PLAN], activePlan: PLAN, completions: [] },
  today: "2026-10-31",
};

/** Every piece of text a reader or a screen reader meets: visible text and aria-labels. */
function allCopy(): string[] {
  const labels = Array.from(document.querySelectorAll("[aria-label]")).map(
    (element) => element.getAttribute("aria-label") ?? "",
  );
  return [document.body.textContent ?? "", ...labels];
}

function renderProfile(initial: FriendReading = READING) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <FriendProfileScreen profile={MARIA} initial={initial} />
    </QueryClientProvider>,
  );
}

describe("FriendProfileScreen", () => {
  it("shows the friend's name, handle and today status", () => {
    renderProfile();

    expect(
      screen.getByRole("heading", { level: 1, name: "Maria" }),
    ).toBeTruthy();
    expect(screen.getByText("@maria")).toBeTruthy();
    expect(screen.getByText("Hasn't read yet today")).toBeTruthy();
  });

  it("links back to the Friends list", () => {
    renderProfile();

    expect(
      screen.getByRole("link", { name: "Friends" }).getAttribute("href"),
    ).toBe("/friends");
  });

  it("shows the friend's month, starting on their today", () => {
    renderProfile();

    expect(
      screen.getByRole("heading", { level: 2, name: "October 2026" }),
    ).toBeTruthy();
  });

  it("steps the calendar and returns to the friend's today", () => {
    renderProfile();

    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(
      screen.getByRole("heading", { level: 2, name: "November 2026" }),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Jump to the current month" }),
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "October 2026" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Jump to the current month" }),
    ).toBeNull();
  });

  it("opens the friend's day from the calendar", () => {
    renderProfile();

    const calendar = screen.getByRole("region", {
      name: /Monthly reading calendar/,
    });
    fireEvent.click(
      within(calendar).getByRole("button", { name: /^Wednesday 28 October/ }),
    );

    expect(router.push).toHaveBeenCalledWith("/friends/maria/day/2026-10-28");
  });

  it("links journal rows to the friend's days", () => {
    renderProfile();

    const links = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href") ?? "");

    expect(links.some((href) => href.startsWith("/friends/maria/day/"))).toBe(
      true,
    );
    expect(links.some((href) => /^\/day\//.test(href))).toBe(false);
  });

  it("has no month toggle and no history link", () => {
    renderProfile();

    expect(screen.queryByRole("button", { name: "Month view" })).toBeNull();
    expect(screen.queryByText(/See your reading history/)).toBeNull();
  });

  it("shows the no-plan state for a friend without a plan", () => {
    renderProfile(NO_PLAN);

    expect(
      screen.getByText("@maria hasn't started a reading plan yet."),
    ).toBeTruthy();
    expect(screen.queryByText("Hasn't read yet today")).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Reading journal" }),
    ).toBeNull();
  });

  describe("wording", () => {
    const SPEAKS_TO_VIEWER = /\byou(r)?\b/i;

    it("never says you or your about a friend with a plan and no readings", () => {
      renderProfile(NO_READINGS);

      expect(
        screen.getByText(
          "Every day they read will gather here, with what they read.",
        ),
      ).toBeTruthy();
      for (const copy of allCopy()) {
        expect(copy).not.toMatch(SPEAKS_TO_VIEWER);
      }
    });

    it("never says you or your in a month before the friend's plan began", () => {
      renderProfile();

      fireEvent.click(screen.getByRole("button", { name: "Previous month" }));

      expect(
        screen.getByRole("heading", { level: 2, name: "September 2026" }),
      ).toBeTruthy();
      expect(screen.getByText("Before the plan began")).toBeTruthy();
      for (const copy of allCopy()) {
        expect(copy).not.toMatch(SPEAKS_TO_VIEWER);
      }
    });
  });
});
