import { describe, expect, it } from "vitest";

import {
  authErrorMessage,
  googleLinkErrorMessage,
  oauthErrorMessage,
} from "../auth-error-message";
import { signInSchema, signUpSchema } from "../schemas";

describe("authErrorMessage", () => {
  it("does not say which of email or password was wrong", () => {
    expect(authErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD" })).toBe(
      "That email and password don't match. Try again.",
    );
  });

  it("points an existing account at sign-in", () => {
    expect(
      authErrorMessage({ code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" }),
    ).toMatch(/Sign in instead/);
  });

  it("explains rate limiting", () => {
    expect(authErrorMessage({ status: 429 })).toMatch(/Too many attempts/);
  });

  it("never shows a raw or unknown server message", () => {
    expect(authErrorMessage({ code: "SOMETHING_NEW", status: 500 })).toBe(
      "Something went wrong. Check your connection and try again.",
    );
    expect(authErrorMessage(null)).toMatch(/Something went wrong/);
  });
});

describe("oauthErrorMessage", () => {
  it("points an unlinked Google sign-in at the password, then Settings", () => {
    // Better Auth's callback reports "account not linked" as error=account_not_linked.
    expect(oauthErrorMessage("account_not_linked")).toBe(
      "An account with this email already exists. Sign in with your password, then connect Google in Settings to use it next time.",
    );
  });

  it("falls back to a generic retry for anything else", () => {
    expect(oauthErrorMessage("access_denied")).toBe(
      "Google sign-in didn't complete. Try again.",
    );
    expect(oauthErrorMessage(undefined)).toMatch(/didn't complete/);
  });
});

describe("auth form schemas", () => {
  it("normalises the email so sign-in matches sign-up", () => {
    expect(
      signInSchema.parse({ email: "  Reader@Example.COM ", password: "x" })
        .email,
    ).toBe("reader@example.com");
  });

  const signUp = {
    firstName: "Ruth",
    lastName: "Moabite",
    email: "reader@example.com",
    password: "12345678",
    confirmPassword: "12345678",
  };

  it("enforces the server's password length limits", () => {
    const withPassword = (password: string) => ({
      ...signUp,
      password,
      confirmPassword: password,
    });
    expect(signUpSchema.safeParse(withPassword("1234567")).success).toBe(false);
    expect(signUpSchema.safeParse(withPassword("12345678")).success).toBe(true);
    expect(signUpSchema.safeParse(withPassword("x".repeat(129))).success).toBe(
      false,
    );
  });

  it("requires a first and a last name", () => {
    for (const blank of [{ firstName: "   " }, { lastName: "" }]) {
      expect(signUpSchema.safeParse({ ...signUp, ...blank }).success).toBe(
        false,
      );
    }
  });

  it("trims the names", () => {
    const values = signUpSchema.parse({
      ...signUp,
      firstName: "  Ruth ",
      lastName: " Moabite  ",
    });
    expect([values.firstName, values.lastName]).toEqual(["Ruth", "Moabite"]);
  });

  it("says when the passwords don't match, on the confirmation field", () => {
    const result = signUpSchema.safeParse({
      ...signUp,
      confirmPassword: "12345679",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        path: ["confirmPassword"],
        message: "Passwords don't match.",
      }),
    ]);
  });

  it("checks the match even while another field is still wrong", () => {
    // Zod skips an object refinement once any field has failed, unless told otherwise:
    // without that, the mismatch would only show after the email was fixed.
    const result = signUpSchema.safeParse({
      ...signUp,
      email: "not an email",
      confirmPassword: "nope",
    });
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual([
      "email",
      "confirmPassword",
    ]);
  });
});

describe("googleLinkErrorMessage", () => {
  it("names each way connecting Google can fail", () => {
    expect(googleLinkErrorMessage("email_does_not_match")).toMatch(
      /different email/,
    );
    expect(
      googleLinkErrorMessage("account_already_linked_to_different_user"),
    ).toMatch(/another Bible Daily account/);
    // The reader cancelled on Google's screen.
    expect(googleLinkErrorMessage("access_denied")).toMatch(/wasn't connected/);
    expect(googleLinkErrorMessage("unable_to_link_account")).toBe(
      "Google couldn't be connected. Try again.",
    );
  });
});
