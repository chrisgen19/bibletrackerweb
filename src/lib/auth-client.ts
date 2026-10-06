import { createAuthClient } from "better-auth/react";

/** Browser-side Better Auth client. Same origin, so no base URL is needed. */
export const authClient = createAuthClient();

/** What a call returns when the network failed before any response arrived. */
export interface NetworkFailure {
  readonly data: null;
  readonly error: {
    readonly status: 0;
    readonly statusText: "Network failure";
  };
}

/**
 * Runs an auth client call, turning a network failure into an ordinary `{ error }`.
 *
 * Better Auth's fetch layer rejects when the request never gets a response (offline, a
 * dropped connection) rather than returning an error. Unwrapped, that left the sign-in,
 * sign-up, Google and sign-out buttons stuck pending with no message. Every component
 * that calls `authClient` goes through this.
 */
export async function catchNetworkFailure<T extends { error: unknown }>(
  call: () => Promise<T>,
): Promise<T | NetworkFailure> {
  try {
    return await call();
  } catch {
    return {
      data: null,
      error: { status: 0, statusText: "Network failure" },
    };
  }
}
