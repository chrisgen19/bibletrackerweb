// Review on #14 (CodeRabbit): Safari can restore the sign-in page from its back/forward
// cache after the reader backs out of Google, with "Continue with Google" still pending.
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GoogleButton } from "../google-button";

const { social } = vi.hoisted(() => ({ social: vi.fn() }));
vi.mock("@/lib/auth-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-client")>()),
  authClient: { signIn: { social } },
}));

describe("GoogleButton", () => {
  it("is usable again when the page comes back from the back/forward cache", async () => {
    social.mockResolvedValue({
      data: { url: "", redirect: true },
      error: null,
    });
    render(<GoogleButton next="/" />);

    await userEvent.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    );
    expect(
      screen.getByRole("button", { name: "Opening Google..." }),
    ).toBeTruthy();

    act(() => {
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      );
    });
    const button = screen.getByRole("button", { name: "Continue with Google" });
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });
});
