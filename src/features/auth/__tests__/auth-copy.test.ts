import { describe, expect, it } from "vitest";

import { authErrorMessage, oauthErrorMessage } from "../auth-error-message";
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
  it("points an unlinked Google sign-in at the existing password account", () => {
    // Better Auth's callback reports "account not linked" as error=account_not_linked.
    expect(oauthErrorMessage("account_not_linked")).toBe(
      "An account with this email already exists. Sign in with your password instead.",
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

  it("enforces the server's password length limits", () => {
    const base = { name: "Reader", email: "reader@example.com" };
    expect(
      signUpSchema.safeParse({ ...base, password: "1234567" }).success,
    ).toBe(false);
    expect(
      signUpSchema.safeParse({ ...base, password: "12345678" }).success,
    ).toBe(true);
    expect(
      signUpSchema.safeParse({ ...base, password: "x".repeat(129) }).success,
    ).toBe(false);
  });

  it("requires a name", () => {
    expect(
      signUpSchema.safeParse({
        name: "   ",
        email: "reader@example.com",
        password: "12345678",
      }).success,
    ).toBe(false);
  });
});
