// Sign-up asks for a first and a last name and a confirmed password, but Better Auth
// stores one name and needs no confirmation: check what actually reaches it.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { router } from "@/test/dom-setup";

import { SignUpForm } from "../sign-up-form";

const { signUpEmail } = vi.hoisted(() => ({ signUpEmail: vi.fn() }));
vi.mock("@/lib/auth-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-client")>()),
  authClient: { signUp: { email: signUpEmail } },
}));

async function fillIn(confirmPassword: string) {
  render(<SignUpForm next="/" googleEnabled={false} />);
  const user = userEvent.setup({ delay: null });
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
    signUpEmail.mockResolvedValue({ data: {}, error: null });
    await fillIn("gleaning-barley");

    expect(signUpEmail).toHaveBeenCalledExactlyOnceWith({
      name: "Ruth Moabite",
      email: "ruth@example.com",
      password: "gleaning-barley",
    });
    expect(router.replace).toHaveBeenCalledWith("/");
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
