import { describe, expect, it } from "vitest";

import { authErrorMessage } from "../auth-error-message";
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
