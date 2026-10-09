// Review on #10 (Codex): Settings named the plan segment's first chapter as the "current
// position", and the reset note counted stored rows as completed chapters.
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";

import { router } from "@/test/dom-setup";
import { readerPartWayThrough } from "@/test/reading-scenarios";

import { SettingsScreen } from "../settings-screen";

const { data } = vi.hoisted(() => ({
  data: { current: {} as Record<string, unknown> },
}));
vi.mock("@/features/reading-plan/hooks/reading-data-provider", () => ({
  useReadingData: () => data.current,
}));
vi.mock("@/features/reading-plan/hooks/use-writes-settled", () => ({
  useWritesSettled: () => true,
}));
vi.mock("@/actions/reading", () => ({ setAppearance: vi.fn() }));
vi.mock("@/features/auth/components/sign-out-button", () => ({
  SignOutButton: () => null,
}));
const { linkSocial, updateUser, changePassword } = vi.hoisted(() => ({
  linkSocial: vi.fn(),
  updateUser: vi.fn(),
  changePassword: vi.fn(),
}));
vi.mock("@/lib/auth-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-client")>()),
  authClient: { linkSocial, updateUser, changePassword },
}));

type Google = ComponentProps<typeof SettingsScreen>["google"];

function renderSettings(google: Google = null, hasPassword = true) {
  data.current = { ...readerPartWayThrough(), resetProgress: vi.fn() };
  render(
    <SettingsScreen
      appearance="system"
      name="Ruth Moabite"
      email="reader@example.test"
      hasPassword={hasPassword}
      google={google}
    />,
  );
}

describe("SettingsScreen", () => {
  it("shows where the reader is, not where the plan segment began", () => {
    renderSettings();

    const row = screen.getByRole("link", { name: /Current position/ });
    expect(row.textContent).toContain("Genesis 5");
    expect(row.textContent).not.toContain("Genesis 1");
  });

  it("says Finished once every chapter has been read", () => {
    const reader = readerPartWayThrough();
    data.current = {
      ...reader,
      scheduleContext: { ...reader.scheduleContext, unread: [] },
      resetProgress: vi.fn(),
    };
    render(
      <SettingsScreen
        appearance="system"
        name="Ruth Moabite"
        email="reader@example.test"
        hasPassword
        google={null}
      />,
    );

    expect(
      screen.getByRole("link", { name: /Current position/ }).textContent,
    ).toContain("Finished");
  });

  // Review on #11 (Codex): the browser bar kept the device's colour, so choosing Dark on a
  // light device put a light bar over a dark page.
  it("recolours the browser bar with the appearance", async () => {
    document.head.innerHTML = `
      <meta name="theme-color" media="(prefers-color-scheme: light)" content="#fbfaf8">
      <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#121110">`;
    const bar = () =>
      [...document.querySelectorAll<HTMLMetaElement>("meta[name=theme-color]")]
        .map((meta) => meta.content)
        .join(" ");
    renderSettings();
    const user = userEvent.setup({ delay: null });

    await user.click(screen.getByRole("radio", { name: "Dark" }));
    expect(document.documentElement.dataset.appearance).toBe("dark");
    expect(bar()).toBe("#121110 #121110");

    await user.click(screen.getByRole("radio", { name: "Light" }));
    expect(bar()).toBe("#fbfaf8 #fbfaf8");

    // System hands the choice back to the device, one colour per scheme.
    await user.click(screen.getByRole("radio", { name: "System" }));
    expect(bar()).toBe("#fbfaf8 #121110");
    document.head.innerHTML = "";
  });

  it("counts chapters read in the reset warning, not stored rows", () => {
    renderSettings();

    // Six rows: one chapter in two sittings, one only part-read. Four chapters, as the
    // progress screen's "chapters read" counts them.
    expect(
      screen.getByText("This will remove 4 completed chapters."),
    ).toBeTruthy();
  });

  describe("Name", () => {
    beforeEach(() => {
      updateUser.mockReset();
      router.refresh.mockReset();
    });

    async function rename(to: string) {
      renderSettings();
      const user = userEvent.setup({ delay: null });
      await user.click(
        screen.getByRole("button", { name: "Name, Ruth Moabite" }),
      );
      const field = screen.getByLabelText("Name");
      expect((field as HTMLInputElement).value).toBe("Ruth Moabite");
      await user.clear(field);
      if (to !== "") await user.type(field, to);
      await user.click(screen.getByRole("button", { name: "Save" }));
    }

    it("saves the new name and reloads what shows it", async () => {
      updateUser.mockResolvedValue({ data: { status: true }, error: null });
      await rename("  Ruth of Moab ");

      expect(updateUser).toHaveBeenCalledExactlyOnceWith({
        name: "Ruth of Moab",
      });
      expect(router.refresh).toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("asks for a name rather than saving an empty one", async () => {
      await rename("");

      expect(await screen.findByText("Enter your name.")).toBeTruthy();
      expect(updateUser).not.toHaveBeenCalled();
    });

    it("stays open and says so when the save never left", async () => {
      updateUser.mockRejectedValue(new TypeError("Failed to fetch"));
      await rename("Ruth of Moab");

      expect(screen.getByRole("alert").textContent).toMatch(
        /Check your connection/,
      );
      expect(screen.getByRole("dialog")).toBeTruthy();
    });
  });

  describe("Password", () => {
    beforeEach(() => {
      changePassword.mockReset();
    });

    async function change(current: string, next: string, confirm: string) {
      renderSettings();
      const user = userEvent.setup({ delay: null });
      await user.click(
        screen.getByRole("button", { name: "Password, Change" }),
      );
      await user.type(screen.getByLabelText("Current password"), current);
      await user.type(
        screen.getByLabelText("New password (at least 8 characters)"),
        next,
      );
      await user.type(screen.getByLabelText("Confirm new password"), confirm);
      await user.click(screen.getByRole("button", { name: "Save" }));
    }

    it("is not offered to an account that signs in only with Google", () => {
      renderSettings({ linked: true, error: null }, false);

      expect(
        screen.queryByRole("button", { name: "Password, Change" }),
      ).toBeNull();
    });

    it("changes it and signs out the reader's other devices", async () => {
      changePassword.mockResolvedValue({ data: {}, error: null });
      await change("gleaning-barley", "threshing-floor", "threshing-floor");

      expect(changePassword).toHaveBeenCalledExactlyOnceWith({
        currentPassword: "gleaning-barley",
        newPassword: "threshing-floor",
        revokeOtherSessions: true,
      });
      expect(await screen.findByText("Password changed")).toBeTruthy();
    });

    it("stops at a confirmation that doesn't match", async () => {
      await change("gleaning-barley", "threshing-floor", "threshing-flour");

      expect(await screen.findByText("Passwords don't match.")).toBeTruthy();
      expect(changePassword).not.toHaveBeenCalled();
    });

    it("points at the current password when it is wrong", async () => {
      changePassword.mockResolvedValue({
        data: null,
        error: { code: "INVALID_PASSWORD", status: 400, statusText: "" },
      });
      await change("not-my-password", "threshing-floor", "threshing-floor");

      expect(
        await screen.findByText("That isn't your current password."),
      ).toBeTruthy();
      expect(
        screen.getByLabelText("Current password").getAttribute("aria-invalid"),
      ).toBe("true");
      expect(screen.queryByText("Password changed")).toBeNull();
    });
  });

  // Review on #16 (Codex): Radix returns focus to a DialogTrigger, and these rows open
  // their dialogs themselves, so closing one dropped keyboard focus on the page body.
  it.each([
    "Name, Ruth Moabite",
    "Password, Change",
  ])("gives focus back to %s when its dialog closes", async (name) => {
    renderSettings();
    const user = userEvent.setup({ delay: null });
    const row = screen.getByRole("button", { name });

    row.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog")).toBeTruthy();
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(row);
  });

  // Production feedback after #13: Google sign-in for an existing password account
  // stopped at "sign in with your password instead", with no way to add Google.
  describe("Google", () => {
    // Braces: a function returned from beforeEach runs as cleanup, which would call it.
    beforeEach(() => {
      linkSocial.mockReset();
    });

    it("is not offered when Google sign-in is not configured", () => {
      renderSettings(null);

      expect(screen.queryByText("Google")).toBeNull();
    });

    it("connects Google from the signed-in account and comes back here", async () => {
      linkSocial.mockResolvedValue({
        data: { url: "", redirect: true },
        error: null,
      });
      renderSettings({ linked: false, error: null });

      await userEvent.click(
        screen.getByRole("button", { name: "Connect Google" }),
      );

      expect(linkSocial).toHaveBeenCalledWith({
        provider: "google",
        callbackURL: "/settings",
        errorCallbackURL: "/settings?google=failed",
      });
      expect(screen.getByText("Opening Google...")).toBeTruthy();
    });

    it("shows a connected Google account without the button", () => {
      renderSettings({ linked: true, error: null });

      expect(screen.getByText("Connected")).toBeTruthy();
      expect(
        screen.queryByRole("button", { name: "Connect Google" }),
      ).toBeNull();
      expect(screen.queryByText(/Connect Google to sign in/)).toBeNull();
    });

    it("shows why the last attempt failed, in the words the page chose", () => {
      // The page maps the callback's error code on the server (googleLinkErrorMessage).
      renderSettings({ linked: false, error: "That Google account is taken." });

      expect(screen.getByRole("alert").textContent).toBe(
        "That Google account is taken.",
      );
    });

    // Review on #14 (CodeRabbit): Safari can restore this page from its back/forward
    // cache after the reader backs out of Google, with the button still pending.
    it("is usable again when the page comes back from the back/forward cache", async () => {
      linkSocial.mockResolvedValue({
        data: { url: "", redirect: true },
        error: null,
      });
      renderSettings({ linked: false, error: null });

      await userEvent.click(
        screen.getByRole("button", { name: "Connect Google" }),
      );
      // An ordinary page show changes nothing.
      act(() => {
        window.dispatchEvent(
          new PageTransitionEvent("pageshow", { persisted: false }),
        );
      });
      expect(screen.getByText("Opening Google...")).toBeTruthy();

      act(() => {
        window.dispatchEvent(
          new PageTransitionEvent("pageshow", { persisted: true }),
        );
      });
      const button = screen.getByRole("button", { name: "Connect Google" });
      expect(button.textContent).toBe("Connect");
      expect((button as HTMLButtonElement).disabled).toBe(false);
    });

    it("lets the reader try again when the request never left", async () => {
      linkSocial.mockRejectedValue(new TypeError("Failed to fetch"));
      renderSettings({ linked: false, error: null });

      await userEvent.click(
        screen.getByRole("button", { name: "Connect Google" }),
      );

      expect(screen.getByRole("alert").textContent).toMatch(
        /Check your connection/,
      );
      expect(
        screen.getByRole("button", { name: "Connect Google" }),
      ).toBeTruthy();
    });
  });
});
