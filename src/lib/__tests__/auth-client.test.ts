// Review on #6: Better Auth's fetch layer rejects on a network failure, which left the
// auth buttons stuck in their pending state. These run a real Better Auth client
// against a network that always fails.
import { createAuthClient } from "better-auth/react";
import { describe, expect, it } from "vitest";

import { authErrorMessage } from "@/features/auth/auth-error-message";

import { catchNetworkFailure } from "../auth-client";

const offlineClient = createAuthClient({
  baseURL: "http://localhost:3100",
  fetchOptions: {
    customFetchImpl: () => Promise.reject(new TypeError("Failed to fetch")),
  },
});

describe("auth calls on a failing network", () => {
  it("reject when unwrapped, which is what left the buttons stuck", async () => {
    await expect(offlineClient.signOut()).rejects.toThrow("Failed to fetch");
  });

  it("resolve to an error once wrapped, so the forms can show a message", async () => {
    const signIn = await catchNetworkFailure(() =>
      offlineClient.signIn.email({
        email: "reader@example.test",
        password: "correct horse battery",
      }),
    );
    expect(signIn.data).toBeNull();
    expect(authErrorMessage(signIn.error)).toBe(
      "Something went wrong. Check your connection and try again.",
    );

    const signOut = await catchNetworkFailure(() => offlineClient.signOut());
    expect(signOut.error).not.toBeNull();
  });

  it("pass a real result through unchanged", async () => {
    const result = { data: { ok: true }, error: null };
    await expect(catchNetworkFailure(async () => result)).resolves.toBe(result);
  });
});
