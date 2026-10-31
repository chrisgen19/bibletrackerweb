import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type {
  FriendProfile,
  FriendsOverview,
} from "@/features/friends/domain/types";
import { navigation, router } from "@/test/dom-setup";

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

/** Opens the Add friends sheet, where the invite link, search and Sent live. */
async function openAddSheet() {
  await userEvent.click(screen.getByRole("button", { name: "Add friends" }));
  return screen.findByRole("dialog", { name: "Add friends" });
}

/** Unfolds the requests banner above the friends list. */
async function openRequests(count: number) {
  await userEvent.click(
    screen.getByRole("button", {
      name: new RegExp(`${count} people want to read with you`),
    }),
  );
}

beforeEach(() => {
  localStorage.clear();
  navigation.search = "";
  window.history.replaceState(null, "", "/friends");
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
    await openAddSheet();

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
    await openAddSheet();
    await userEvent.type(screen.getByLabelText("Username to search"), "maria");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    await userEvent.click(await screen.findByRole("button", { name: "Add" }));

    expect(actions.sendRequest).toHaveBeenCalledWith({ userId: "u9" });
    expect(actions.searchUsername).toHaveBeenCalledTimes(2);
  });

  it("says when no one has that username", async () => {
    actions.searchUsername.mockResolvedValue({ ok: true, match: null });
    renderScreen();
    await openAddSheet();

    await userEvent.type(screen.getByLabelText("Username to search"), "nobody");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("No one with that username")).toBeTruthy();
  });

  it("hides Requests and Waiting on when empty", async () => {
    renderScreen();

    expect(screen.queryByRole("region", { name: /Requests/ })).toBeNull();
    expect(screen.getByText("No friends yet")).toBeTruthy();
    const sheet = await openAddSheet();
    expect(within(sheet).queryByText("Waiting on")).toBeNull();
  });

  it("offers Decline all only above five incoming", async () => {
    const five = { ...EMPTY, incoming: [1, 2, 3, 4, 5].map(profile) };
    renderScreen(five);
    await openRequests(5);
    expect(screen.getAllByRole("button", { name: "Accept" })).toHaveLength(5);
    expect(screen.queryByRole("button", { name: "Decline all" })).toBeNull();
  });

  it("offers Decline all with six incoming, behind a confirm", async () => {
    renderScreen({ ...EMPTY, incoming: [1, 2, 3, 4, 5, 6].map(profile) });
    await openRequests(6);

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
    await openRequests(6);

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
    await openAddSheet();

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
  it("folds incoming requests into one banner that opens in place", async () => {
    renderScreen({ ...EMPTY, incoming: [1, 2, 3, 4].map(profile) });

    expect(
      screen.getByRole("region", { name: "Requests, 4 pending" }),
    ).toBeTruthy();
    expect(screen.getByText("Reader 1, Reader 2 and 2 more")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();

    await openRequests(4);
    const accepts = screen.getAllByRole("button", { name: "Accept" });
    expect(accepts).toHaveLength(4);
    expect(window.location.search).toBe("?requests=open");

    const [first] = accepts;
    if (first === undefined) throw new Error("no Accept button");
    await userEvent.click(first);
    expect(actions.acceptRequest).toHaveBeenCalledWith({ userId: "u1" });
  });

  it("names the one person when a single request waits", () => {
    renderScreen({ ...EMPTY, incoming: [profile(3)] });

    expect(
      screen.getByRole("button", { name: /Reader 3 wants to read with you/ }),
    ).toBeTruthy();
  });

  it("opens the requests from the URL", () => {
    navigation.search = "?requests=open";
    renderScreen({ ...EMPTY, incoming: [1, 2].map(profile) });

    expect(screen.getAllByRole("button", { name: "Accept" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Decline" })).toHaveLength(2);
  });

  it("keeps the username, link and Sent in the Add friends sheet", async () => {
    renderScreen({
      ...EMPTY,
      outgoing: [{ userId: "u7", username: "boaz" }],
    });
    expect(screen.queryByText(INVITE)).toBeNull();

    const sheet = await openAddSheet();
    expect(window.location.search).toBe("?sheet=add");
    expect(within(sheet).getByText("@ruth")).toBeTruthy();
    expect(within(sheet).getByText(INVITE)).toBeTruthy();
    expect(within(sheet).getByText("Waiting on")).toBeTruthy();
    await userEvent.click(
      within(sheet).getByRole("button", { name: "Cancel" }),
    );

    expect(actions.cancelRequest).toHaveBeenCalledWith({ userId: "u7" });
  });

  it("opens the Add friends sheet from the URL", () => {
    navigation.search = "?sheet=add";
    renderScreen();

    expect(screen.getByRole("dialog", { name: "Add friends" })).toBeTruthy();
  });

  it("pushes a history entry for the sheet, and closing goes back", async () => {
    const pushState = vi.spyOn(window.history, "pushState");
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    renderScreen();

    await openAddSheet();
    expect(pushState).toHaveBeenCalledWith(
      expect.anything(),
      "",
      "/friends?sheet=add",
    );
    await userEvent.keyboard("{Escape}");

    expect(back).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog", { name: "Add friends" })).toBeNull();
    pushState.mockRestore();
    back.mockRestore();
  });

  it("does not go back when the sheet was opened from a link", async () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    navigation.search = "?sheet=add";
    window.history.replaceState(null, "", "/friends?sheet=add");
    renderScreen();

    await userEvent.keyboard("{Escape}");

    // Going back would leave the app; the param is dropped in place instead.
    expect(back).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
    back.mockRestore();
  });

  it("keeps the requests banner in place, without a history entry", async () => {
    const pushState = vi.spyOn(window.history, "pushState");
    renderScreen({ ...EMPTY, incoming: [profile(1), profile(2)] });

    await openRequests(2);

    expect(window.location.search).toBe("?requests=open");
    expect(pushState).not.toHaveBeenCalled();
    pushState.mockRestore();
  });

  it("opens the Add friends sheet when the URL changes while mounted", () => {
    // A fresh element each time, as a new URL re-renders the screen in the app.
    const view = () => (
      <FriendsScreen
        userId="me"
        username="ruth"
        inviteUrl={INVITE}
        overview={EMPTY}
      />
    );
    const { rerender } = render(view());
    expect(screen.queryByRole("dialog", { name: "Add friends" })).toBeNull();

    navigation.search = "?sheet=add";
    rerender(view());

    expect(screen.getByRole("dialog", { name: "Add friends" })).toBeTruthy();
  });

  it("changes the username from the sheet", async () => {
    renderScreen();
    const sheet = await openAddSheet();

    await userEvent.click(
      within(sheet).getByRole("button", { name: "Change" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Change username",
    });
    const field = within(dialog).getByLabelText("Username");
    await userEvent.clear(field);
    await userEvent.type(field, "ruth_m");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(actions.setUsername).toHaveBeenCalledWith({ username: "ruth_m" });
    expect(router.refresh).toHaveBeenCalled();
  });

  it("starts adding from the empty friends list", async () => {
    renderScreen();

    await userEvent.click(
      screen.getByRole("button", { name: "Invite a friend" }),
    );

    expect(
      await screen.findByRole("dialog", { name: "Add friends" }),
    ).toBeTruthy();
  });

  it("lists friends as the main content, with a count", () => {
    renderScreen({ ...EMPTY, friends: [1, 2, 3].map(profile) });

    expect(screen.getByText("3 friends")).toBeTruthy();
    const list = screen.getByRole("list", { name: "Friends" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  });
});
