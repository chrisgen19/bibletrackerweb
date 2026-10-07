"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient, catchNetworkFailure } from "@/lib/auth-client";

import { authErrorMessage } from "../auth-error-message";
import { useLeavingPending } from "../hooks/use-leaving-pending";
import { authHref } from "../safe-next-path";

/**
 * "Continue with Google". On success the browser leaves for Google and comes back to
 * `next`; if Google sends the reader back with an error, they land on sign-in again,
 * still carrying `next`.
 */
export function GoogleButton({ next }: { next: string }) {
  const [pending, setPending] = useLeavingPending();
  const [error, setError] = useState<string | null>(null);

  async function continueWithGoogle() {
    setPending(true);
    setError(null);
    const result = await catchNetworkFailure(() =>
      authClient.signIn.social({
        provider: "google",
        callbackURL: next,
        // Keep `next`, so signing in another way afterwards still lands there.
        errorCallbackURL: authHref("/sign-in", next, { oauth: "failed" }),
      }),
    );
    if (result.error) {
      setPending(false);
      setError(authErrorMessage(result.error));
    }
  }

  return (
    <div className="grid gap-2">
      <Button
        variant="outline"
        size="lg"
        className="h-10"
        disabled={pending}
        onClick={continueWithGoogle}
      >
        {pending ? "Opening Google..." : "Continue with Google"}
      </Button>
      {error === null ? null : (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
