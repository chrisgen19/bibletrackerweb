"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient, catchNetworkFailure } from "@/lib/auth-client";

/**
 * Signs the reader out and sends them to sign-in, for the account menu and the Settings
 * button alike.
 *
 * Only the server can clear the session cookie. If the call fails (say, offline), the
 * session is still valid and sign-in would bounce the reader straight back, so `failed`
 * is set for the caller to offer a retry instead of pretending it worked.
 */
export function useSignOut() {
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
    setPending(false);
    setFailed(true);
  }

  return { signOut, pending, failed };
}
