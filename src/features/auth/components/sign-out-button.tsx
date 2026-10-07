"use client";

import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { useSignOut } from "@/features/auth/hooks/use-sign-out";

type SignOutButtonProps = Pick<
  ComponentProps<typeof Button>,
  "variant" | "size" | "className"
>;

export function SignOutButton({
  variant = "ghost",
  size = "sm",
  className,
}: SignOutButtonProps) {
  const { signOut, pending, failed } = useSignOut();

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled={pending}
        onClick={signOut}
      >
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
