"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient, catchNetworkFailure } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signOut() {
    setPending(true);
    setFailed(false);
    const { error } = await catchNetworkFailure(() => authClient.signOut());
    if (error === null) {
      router.replace("/sign-in");
      router.refresh();
      return;
    }
    // Only the server can clear the session cookie. If the call failed (say, offline),
    // the session is still valid and sign-in would bounce the reader straight back, so
    // stay here and offer a retry instead of pretending it worked.
    setPending(false);
    setFailed(true);
  }

  return (
    <>
      <Button variant="ghost" size="sm" disabled={pending} onClick={signOut}>
        {pending ? "Signing out..." : failed ? "Retry sign out" : "Sign out"}
      </Button>
      <output aria-live="polite" className="sr-only">
        {failed
          ? "Couldn't sign out. Check your connection and try again."
          : ""}
      </output>
    </>
  );
}
