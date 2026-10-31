"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  type FriendsErrorCode,
  friendsErrorMessage,
} from "@/features/friends/commands/results";

type Outcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: FriendsErrorCode };

interface RunOptions {
  /** Refresh the server data after a success. On by default; a search turns it off. */
  readonly refresh?: boolean;
}

/**
 * Runs one friends Server Action with the screen's shared behaviour: disabled while
 * pending, the error copy kept for inline display, and `router.refresh()` on success.
 * A call that throws (offline) reads as the client-only `network` error.
 *
 * `run` resolves to the action's success result, or `null` when it failed.
 */
export function useFriendAction() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run<R extends Outcome>(
    call: () => Promise<R>,
    { refresh = true }: RunOptions = {},
  ): Promise<Extract<R, { ok: true }> | null> {
    setPending(true);
    setError(null);
    try {
      const result = await call();
      if (!result.ok) {
        setError(friendsErrorMessage(result.error));
        return null;
      }
      if (refresh) router.refresh();
      return result as Extract<R, { ok: true }>;
    } catch {
      setError(friendsErrorMessage("network"));
      return null;
    } finally {
      setPending(false);
    }
  }

  return { run, pending, error, clearError: () => setError(null) };
}
