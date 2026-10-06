"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    // Leave either way: if the server call failed, the next protected request will
    // still find no valid session and come back to sign-in.
    await authClient.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={signOut}>
      {pending ? "Signing out..." : "Sign out"}
    </Button>
  );
}
