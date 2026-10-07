// Review on #10 (Codex): Settings named the plan segment's first chapter as the "current
// position", and the reset note counted stored rows as completed chapters.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

function renderSettings() {
  data.current = { ...readerPartWayThrough(), resetProgress: vi.fn() };
  render(<SettingsScreen appearance="system" email="reader@example.test" />);
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
    render(<SettingsScreen appearance="system" email="reader@example.test" />);

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
});
