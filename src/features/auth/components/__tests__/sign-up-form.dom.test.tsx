// Sign-up asks for a first and a last name and a confirmed password, but Better Auth
// stores one name and needs no confirmation: check what actually reaches it.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { router } from "@/test/dom-setup";

import { SignUpForm } from "../sign-up-form";

const { signUpEmail, setUsername } = vi.hoisted(() => ({
  signUpEmail: vi.fn(),
  setUsername: vi.fn(),
}));
vi.mock("@/actions/friends", () => ({ setUsername }));
vi.mock("@/lib/auth-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-client")>()),
  authClient: { signUp: { email: signUpEmail } },
}));

const STORAGE_KEY = "friends:missed-username";
const SIGNED_UP = { data: { user: { id: "u1" } }, error: null };

async function fillIn(confirmPassword: string, username = "") {
  render(<SignUpForm next="/" googleEnabled={false} />);
  const user = userEvent.setup({ delay: null });
  if (username !== "") {
    await user.type(screen.getByLabelText("Username (optional)"), username);
  }
  await user.type(screen.getByLabelText("First name"), " Ruth ");
  await user.type(screen.getByLabelText("Last name"), "Moabite");
  await user.type(screen.getByLabelText("Email"), "Ruth@Example.com");
  await user.type(
    screen.getByLabelText("Password (at least 8 characters)"),
    "gleaning-barley",
  );
  await user.type(screen.getByLabelText("Confirm password"), confirmPassword);
  await user.click(screen.getByRole("button", { name: "Create account" }));
}

describe("SignUpForm", () => {
  beforeEach(() => {
    signUpEmail.mockReset();
    setUsername.mockReset();
    localStorage.clear();
    router.replace.mockReset();
  });

  it("stops at a confirmation that doesn't match", async () => {
    await fillIn("gleaning-wheat");

    expect(await screen.findByText("Passwords don't match.")).toBeTruthy();
    expect(
      screen.getByLabelText("Confirm password").getAttribute("aria-invalid"),
    ).toBe("true");
    expect(signUpEmail).not.toHaveBeenCalled();
  });

  it("sends one name and the password, never the confirmation", async () => {
    signUpEmail.mockResolvedValue(SIGNED_UP);
    await fillIn("gleaning-barley");

    expect(signUpEmail).toHaveBeenCalledExactlyOnceWith({
      name: "Ruth Moabite",
      email: "ruth@example.com",
      password: "gleaning-barley",
    });
    expect(router.replace).toHaveBeenCalledWith("/");
  });

  it("leaves the username for the Friends screen when it is skipped", async () => {
    signUpEmail.mockResolvedValue(SIGNED_UP);
    await fillIn("gleaning-barley");

    expect(router.replace).toHaveBeenCalledWith("/");
    expect(setUsername).not.toHaveBeenCalled();
  });

  it("saves a username once the account exists", async () => {
    signUpEmail.mockResolvedValue(SIGNED_UP);
    setUsername.mockResolvedValue({ ok: true });
    await fillIn("gleaning-barley", "@Ruth_M");

    expect(setUsername).toHaveBeenCalledExactlyOnceWith({ username: "ruth_m" });
    // The username needs the session that sign-up creates.
    const [signedUpAt] = signUpEmail.mock.invocationCallOrder;
    const [savedAt] = setUsername.mock.invocationCallOrder;
    expect(signedUpAt).toBeLessThan(savedAt ?? 0);
    expect(router.replace).toHaveBeenCalledWith("/");
  });

  it("goes on when the username was taken, and remembers it for Friends", async () => {
    signUpEmail.mockResolvedValue(SIGNED_UP);
    setUsername.mockResolvedValue({ ok: false, error: "username-taken" });
    await fillIn("gleaning-barley", "Ruth");

    expect(router.replace).toHaveBeenCalledWith("/");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")).toEqual({
      userId: "u1",
      username: "ruth",
    });
  });

  it("clears an old note once the username is saved", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ userId: "u0", username: "naomi" }),
    );
    signUpEmail.mockResolvedValue(SIGNED_UP);
    setUsername.mockResolvedValue({ ok: true });
    await fillIn("gleaning-barley", "ruth");

    expect(router.replace).toHaveBeenCalledWith("/");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("goes on when saving the username fails on the network", async () => {
    signUpEmail.mockResolvedValue(SIGNED_UP);
    setUsername.mockRejectedValue(new TypeError("Failed to fetch"));
    await fillIn("gleaning-barley", "ruth");

    expect(router.replace).toHaveBeenCalledWith("/");
  });

  it("stops at a username that breaks the rules", async () => {
    await fillIn("gleaning-barley", "ab");

    expect(
      await screen.findByText("Use 3 to 20 letters, numbers or underscores."),
    ).toBeTruthy();
    expect(signUpEmail).not.toHaveBeenCalled();
    expect(setUsername).not.toHaveBeenCalled();
  });

  it("does not try the username when sign-up fails", async () => {
    signUpEmail.mockResolvedValue({
      data: null,
      error: { code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" },
    });
    await fillIn("gleaning-barley", "ruth");

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(setUsername).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("asks for each name", async () => {
    render(<SignUpForm next="/" googleEnabled={false} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Create account" }),
    );

    expect(await screen.findByText("Enter your first name.")).toBeTruthy();
    expect(screen.getByText("Enter your last name.")).toBeTruthy();
    expect(signUpEmail).not.toHaveBeenCalled();
  });
});
