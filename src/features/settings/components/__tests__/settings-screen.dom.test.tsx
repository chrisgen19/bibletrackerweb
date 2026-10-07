// Review on #10 (Codex): Settings named the plan segment's first chapter as the "current
// position", and the reset note counted stored rows as completed chapters.
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";

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
const { linkSocial } = vi.hoisted(() => ({ linkSocial: vi.fn() }));
vi.mock("@/lib/auth-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-client")>()),
  authClient: { linkSocial },
}));

type Google = ComponentProps<typeof SettingsScreen>["google"];

function renderSettings(google: Google = null) {
  data.current = { ...readerPartWayThrough(), resetProgress: vi.fn() };
  render(
    <SettingsScreen
      appearance="system"
      email="reader@example.test"
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
        email="reader@example.test"
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
    const user = userEvent.setup();

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
