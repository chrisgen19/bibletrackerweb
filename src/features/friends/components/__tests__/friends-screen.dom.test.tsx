import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type {
  FriendProfile,
  FriendsOverview,
} from "@/features/friends/domain/types";
import { router } from "@/test/dom-setup";

import { FriendsScreen } from "../friends-screen";

const actions = vi.hoisted(() => ({
  setUsername: vi.fn(),
  searchUsername: vi.fn(),
  sendRequest: vi.fn(),
  acceptRequest: vi.fn(),
  declineRequest: vi.fn(),
  cancelRequest: vi.fn(),
  removeFriend: vi.fn(),
  declineAllRequests: vi.fn(),
  resetInvite: vi.fn(),
}));
vi.mock("@/actions/friends", () => actions);

const EMPTY: FriendsOverview = { friends: [], incoming: [], outgoing: [] };
const INVITE = "https://example.test/add/abc123";

const profile = (n: number): FriendProfile => ({
  userId: `u${n}`,
  username: `reader${n}`,
  name: `Reader ${n}`,
  image: null,
});

function renderScreen(overview: FriendsOverview = EMPTY, username = "ruth") {
  render(
    <FriendsScreen
      userId="me"
      username={username}
      inviteUrl={INVITE}
      overview={overview}
    />,
  );
}

beforeEach(() => {
  localStorage.clear();
  for (const action of Object.values(actions)) {
    action.mockReset();
    action.mockResolvedValue({ ok: true });
  }
});

describe("FriendsScreen", () => {
  it("asks for a username before anything else", () => {
    render(
      <FriendsScreen
        userId="me"
        username={null}
        inviteUrl={null}
        overview={EMPTY}
      />,
    );

    expect(screen.getByLabelText("Username")).toBeTruthy();
    expect(
      screen.getByText(/3 to 20 letters, numbers or underscores/),
    ).toBeTruthy();
    expect(screen.queryByText("Your invite link")).toBeNull();
  });

  it("says why it asks again when the sign-up username was taken", async () => {
    localStorage.setItem(
      "friends:missed-username",
      JSON.stringify({ userId: "me", username: "ruth" }),
    );
    actions.setUsername.mockResolvedValue({ ok: true });
    render(
      <FriendsScreen
        userId="me"
        username={null}
        inviteUrl={null}
        overview={EMPTY}
      />,
    );

    expect(
      await screen.findByText(
        "@ruth was already taken when you signed up, so pick another one.",
      ),
    ).toBeTruthy();

    await userEvent.type(screen.getByLabelText("Username"), "ruth_m");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(router.refresh).toHaveBeenCalled();
    expect(localStorage.getItem("friends:missed-username")).toBeNull();
  });

  it("does not show another reader's sign-up note", () => {
    localStorage.setItem(
      "friends:missed-username",
      JSON.stringify({ userId: "someone-else", username: "ruth" }),
    );
    render(
      <FriendsScreen
        userId="me"
        username={null}
        inviteUrl={null}
        overview={EMPTY}
      />,
    );

    expect(screen.queryByText(/already taken when you signed up/)).toBeNull();
  });

  it("shows the server's error copy when a username is taken", async () => {
    actions.setUsername.mockResolvedValue({
      ok: false,
      error: "username-taken",
    });
    render(
      <FriendsScreen
        userId="me"
        username={null}
        inviteUrl={null}
        overview={EMPTY}
      />,
    );

    await userEvent.type(screen.getByLabelText("Username"), "maria");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "That username is taken.",
    );
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("shows search results as a handle only", async () => {
    actions.searchUsername.mockResolvedValue({
      ok: true,
      match: {
        handle: { userId: "u9", username: "maria" },
        relationship: "none",
      },
    });
    renderScreen();

    await userEvent.type(screen.getByLabelText("Username to search"), "maria");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("@maria")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add" })).toBeTruthy();
    expect(screen.queryByText(/Maria /)).toBeNull();
  });

  it("searches again after a row action", async () => {
    actions.searchUsername.mockResolvedValue({
      ok: true,
      match: {
        handle: { userId: "u9", username: "maria" },
        relationship: "none",
      },
    });
    renderScreen();
    await userEvent.type(screen.getByLabelText("Username to search"), "maria");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    await userEvent.click(await screen.findByRole("button", { name: "Add" }));

    expect(actions.sendRequest).toHaveBeenCalledWith({ userId: "u9" });
    expect(actions.searchUsername).toHaveBeenCalledTimes(2);
  });

  it("says when no one has that username", async () => {
    actions.searchUsername.mockResolvedValue({ ok: true, match: null });
    renderScreen();

    await userEvent.type(screen.getByLabelText("Username to search"), "nobody");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("No one with that username")).toBeTruthy();
  });

  it("hides Requests and Sent when empty", () => {
    renderScreen();

    expect(screen.queryByText("Requests")).toBeNull();
    expect(screen.queryByText("Sent")).toBeNull();
    expect(screen.getByText("No friends yet")).toBeTruthy();
  });

  it("offers Decline all only above five incoming", () => {
    const five = { ...EMPTY, incoming: [1, 2, 3, 4, 5].map(profile) };
    renderScreen(five);
    expect(screen.queryByRole("button", { name: "Decline all" })).toBeNull();
  });

  it("offers Decline all with six incoming, behind a confirm", async () => {
    renderScreen({ ...EMPTY, incoming: [1, 2, 3, 4, 5, 6].map(profile) });

    await userEvent.click(screen.getByRole("button", { name: "Decline all" }));
    expect(actions.declineAllRequests).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Decline all" }),
    );

    expect(actions.declineAllRequests).toHaveBeenCalledTimes(1);
  });

  it("shows why Decline all failed, after its dialog closes", async () => {
    actions.declineAllRequests.mockResolvedValue({
      ok: false,
      error: "network",
    });
    renderScreen({ ...EMPTY, incoming: [1, 2, 3, 4, 5, 6].map(profile) });

    await userEvent.click(screen.getByRole("button", { name: "Decline all" }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Decline all" }),
    );

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Couldn't save that",
    );
  });

  it("confirms before removing a friend", async () => {
    renderScreen({ ...EMPTY, friends: [profile(1)] });

    await userEvent.click(
      screen.getByRole("button", { name: "Options for Reader 1" }),
    );
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Remove" }),
    );
    expect(actions.removeFriend).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain("Remove @reader1?");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Remove" }),
    );

    expect(actions.removeFriend).toHaveBeenCalledWith({ userId: "u1" });
  });

  it("confirms before resetting the invite link", async () => {
    actions.resetInvite.mockResolvedValue({ ok: true, code: "new" });
    renderScreen();

    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(actions.resetInvite).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain(
      "People who haven't used your old link won't be able to.",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Reset link" }),
    );

    expect(actions.resetInvite).toHaveBeenCalledTimes(1);
  });
});
