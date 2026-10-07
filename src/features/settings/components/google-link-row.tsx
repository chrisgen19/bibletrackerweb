"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authErrorMessage } from "@/features/auth/auth-error-message";
import { useLeavingPending } from "@/features/auth/hooks/use-leaving-pending";
import { authClient, catchNetworkFailure } from "@/lib/auth-client";

export interface GoogleLinkState {
  /** The reader can already sign in with Google. */
  readonly linked: boolean;
  /**
   * Why the last "Connect" round trip failed, already in words: the page turns the
   * callback's `error` code into copy on the server, so the raw value never reaches here.
   */
  readonly error: string | null;
}

/**
 * Connects Google to the signed-in account, so "Continue with Google" works next time.
 *
 * Sign-in never attaches Google to an email + password account on its own: that email
 * was never verified, so anyone could have registered it. Here the reader is already
 * signed in with the password, and Google proves the same email, so both sides are known.
 */
export function GoogleLinkRow({ linked, error }: GoogleLinkState) {
  const [pending, setPending] = useLeavingPending();
  const [failure, setFailure] = useState(error);

  async function connect() {
    setPending(true);
    setFailure(null);
    const result = await catchNetworkFailure(() =>
      authClient.linkSocial({
        provider: "google",
        callbackURL: "/settings",
        // Better Auth adds `error=<code>` to this.
        errorCallbackURL: "/settings?google=failed",
      }),
    );
    // On success the browser is already on its way to Google.
    if (result.error) {
      setPending(false);
      setFailure(authErrorMessage(result.error));
    }
  }

  return (
    <div className="py-1.5 pr-2 pl-4">
      <div className="flex min-h-11 items-center gap-3">
        <span className="flex-1 text-body">Google</span>
        {linked ? (
          <span className="flex items-center gap-1.5 pr-3 text-body text-muted-foreground">
            <Check className="size-4 text-primary" aria-hidden />
            Connected
          </span>
        ) : (
          <Button
            variant="plain"
            size="medium"
            disabled={pending}
            onClick={connect}
            aria-label={pending ? undefined : "Connect Google"}
          >
            {pending ? "Opening Google..." : "Connect"}
          </Button>
        )}
      </div>
      {failure === null ? null : (
        <p role="alert" className="pr-2 pb-1.5 text-footnote text-destructive">
          {failure}
        </p>
      )}
    </div>
  );
}
