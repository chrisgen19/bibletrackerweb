"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient, catchNetworkFailure } from "@/lib/auth-client";

import { authErrorMessage } from "../auth-error-message";

/**
 * "Continue with Google". On success the browser leaves for Google and comes back to
 * `next`; if Google sends the reader back with an error, they land on sign-in again.
 */
export function GoogleButton({ next }: { next: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continueWithGoogle() {
    setPending(true);
    setError(null);
    const result = await catchNetworkFailure(() =>
      authClient.signIn.social({
        provider: "google",
        callbackURL: next,
        errorCallbackURL: "/sign-in?oauth=failed",
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
