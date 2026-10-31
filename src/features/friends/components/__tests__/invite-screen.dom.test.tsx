import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { FriendProfile } from "@/features/friends/domain/types";
import { router } from "@/test/dom-setup";

import { InviteScreen } from "../invite-screen";

const actions = vi.hoisted(() => ({
  setUsername: vi.fn(),
  sendRequestByInvite: vi.fn(),
  acceptRequest: vi.fn(),
  cancelRequest: vi.fn(),
}));
vi.mock("@/actions/friends", () => actions);

const OWNER: FriendProfile = {
  userId: "u1",
  username: "ruth",
  name: "Ruth Cruz",
  image: null,
};

type Props = Parameters<typeof InviteScreen>[0];

function renderScreen(overrides: Partial<Props> = {}) {
  render(
    <InviteScreen
      userId="me"
      owner={OWNER}
      relationship="none"
      viewerHasUsername
      code="abc123"
      afterHref="/friends"
      inviteUrl={null}
      {...overrides}
    />,
  );
}

beforeEach(() => {
  localStorage.clear();
  for (const action of Object.values(actions)) {
    action.mockReset();
    action.mockResolvedValue({ ok: true });
  }
  router.push.mockClear();
  router.refresh.mockClear();
});

describe("InviteScreen", () => {
  it("shows the dead-link copy when the owner is null", () => {
    renderScreen({ owner: null });

    expect(screen.getByText("This invite link no longer works.")).toBeTruthy();
    expect(screen.getByText("Ask your friend for a new one.")).toBeTruthy();
  });

  it("shows the owner's name, photo and handle with a send button", () => {
    renderScreen({ owner: { ...OWNER, image: "https://img.test/r.png" } });

    expect(screen.getByText("Ruth Cruz")).toBeTruthy();
    expect(screen.getByText("@ruth")).toBeTruthy();
    expect(document.querySelector("img")?.getAttribute("src")).toBe(
      "https://img.test/r.png",
    );
    expect(
      screen.getByRole("button", { name: "Send friend request" }),
    ).toBeTruthy();
  });

  it("sends only when the button is tapped", async () => {
    renderScreen();
    expect(actions.sendRequestByInvite).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("button", { name: "Send friend request" }),
    );

    expect(actions.sendRequestByInvite).toHaveBeenCalledWith({
      code: "abc123",
    });
    expect(router.push).toHaveBeenCalledWith("/friends");
  });

  it("refreshes instead of leaving when a plain send fails", async () => {
    actions.sendRequestByInvite.mockResolvedValue({
      ok: false,
      error: "not-found",
    });
    renderScreen();

    await userEvent.click(
      screen.getByRole("button", { name: "Send friend request" }),
    );

    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("lets a reader without a username pick one and send in one step", async () => {
    renderScreen({ viewerHasUsername: false });
    expect(
      screen.queryByRole("button", { name: "Send friend request" }),
    ).toBeNull();

    await userEvent.type(screen.getByLabelText("Username"), "maria");
    await userEvent.click(
      screen.getByRole("button", { name: "Save and send request" }),
    );

    expect(actions.setUsername).toHaveBeenCalledWith({ username: "maria" });
    expect(actions.sendRequestByInvite).toHaveBeenCalledWith({
      code: "abc123",
    });
    expect(router.push).toHaveBeenCalledWith("/friends");
  });

  it("says why it asks for a username when the sign-up pick was taken", async () => {
    localStorage.setItem(
      "friends:missed-username",
      JSON.stringify({ userId: "me", username: "ruth" }),
    );
    renderScreen({ viewerHasUsername: false });

    expect(
      await screen.findByText(
        "@ruth was already taken when you signed up, so pick another one.",
      ),
    ).toBeTruthy();

    await userEvent.type(screen.getByLabelText("Username"), "ruth_m");
    await userEvent.click(
      screen.getByRole("button", { name: "Save and send request" }),
    );

    expect(router.push).toHaveBeenCalledWith("/friends");
    expect(localStorage.getItem("friends:missed-username")).toBeNull();
  });

  it("shows no sign-up note once the reader has a username", () => {
    localStorage.setItem(
      "friends:missed-username",
      JSON.stringify({ userId: "me", username: "ruth" }),
    );
    renderScreen();

    expect(screen.queryByText(/already taken when you signed up/)).toBeNull();
  });

  it("shows the error and refreshes when sending fails after the username saved", async () => {
    actions.sendRequestByInvite.mockResolvedValue({
      ok: false,
      error: "friend-limit",
    });
    renderScreen({ viewerHasUsername: false });

    await userEvent.type(screen.getByLabelText("Username"), "maria");
    await userEvent.click(
      screen.getByRole("button", { name: "Save and send request" }),
    );

    expect(
      await screen.findByText("One of you has reached the friend limit."),
    ).toBeTruthy();
    expect(router.refresh).toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("goes to onboarding after sending when there is no plan", async () => {
    renderScreen({ afterHref: "/onboarding" });

    await userEvent.click(
      screen.getByRole("button", { name: "Send friend request" }),
    );

    expect(router.push).toHaveBeenCalledWith("/onboarding");
  });

  it("offers Accept when the owner already asked", async () => {
    renderScreen({ relationship: "incoming" });

    await userEvent.click(
      screen.getByRole("button", { name: "Accept request" }),
    );

    expect(actions.sendRequestByInvite).toHaveBeenCalledWith({
      code: "abc123",
    });
    expect(router.push).toHaveBeenCalledWith("/friends");
  });

  it("cancels an outgoing request and stays on the page", async () => {
    renderScreen({ relationship: "outgoing" });
    expect(screen.getByText("Request sent")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(actions.cancelRequest).toHaveBeenCalledWith({ userId: "u1" });
    expect(router.refresh).toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("shows the reader their own link without a reset", () => {
    renderScreen({
      relationship: "self",
      inviteUrl: "https://example.test/add/abc123",
    });

    expect(screen.getByText("This is your invite link")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reset" })).toBeNull();
  });

  it("links to friends when already friends", () => {
    renderScreen({ relationship: "friends" });

    expect(screen.getByText("You're already friends")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /friends/i }).getAttribute("href"),
    ).toBe("/friends");
  });
});
