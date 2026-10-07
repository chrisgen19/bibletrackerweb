// Production feedback after #11: "there's no way I can log out". Sign-out lived only in
// Settings, behind a gear, and onboarding had no way out at all.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { router } from "@/test/dom-setup";

import { AccountProvider } from "../../hooks/account-context";
import { AccountMenu } from "../account-menu";

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock("@/lib/auth-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-client")>()),
  authClient: { signOut },
}));

async function openMenu(name = "Christian") {
  render(
    <AccountProvider account={{ name, email: "reader@example.test" }}>
      <AccountMenu />
    </AccountProvider>,
  );
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: "Account, reader@example.test" }),
  );
  return user;
}

describe("AccountMenu", () => {
  beforeEach(() => {
    signOut.mockReset();
    router.replace.mockReset();
  });

  it("shows who is signed in, with the initial on the button", async () => {
    await openMenu();

    expect(screen.getByTestId("account-menu").textContent).toBe("C");
    expect(screen.getByText("Christian")).toBeTruthy();
    expect(screen.getByText("reader@example.test")).toBeTruthy();
  });

  it("falls back to the email's initial without a name", async () => {
    await openMenu("  ");

    expect(screen.getByTestId("account-menu").textContent).toBe("R");
  });

  it("links to Settings", async () => {
    await openMenu();

    expect(
      screen.getByRole("menuitem", { name: "Settings" }).getAttribute("href"),
    ).toBe("/settings");
  });

  it("signs out and goes to sign-in", async () => {
    signOut.mockResolvedValue({ data: { success: true }, error: null });
    const user = await openMenu();

    await user.click(screen.getByRole("menuitem", { name: "Sign out" }));

    expect(signOut).toHaveBeenCalledOnce();
    expect(router.replace).toHaveBeenCalledWith("/sign-in");
  });

  it("stays open and offers a retry when signing out fails", async () => {
    signOut.mockRejectedValue(new TypeError("Failed to fetch"));
    const user = await openMenu();

    await user.click(screen.getByRole("menuitem", { name: "Sign out" }));

    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain(
      "Couldn't sign out",
    );
    expect(
      screen.getByRole("menuitem", { name: "Retry sign out" }),
    ).toBeTruthy();
  });
});
