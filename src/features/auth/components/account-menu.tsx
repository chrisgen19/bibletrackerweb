"use client";

import { LogOut, Settings } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type Account,
  useAccount,
} from "@/features/auth/hooks/account-context";
import { useSignOut } from "@/features/auth/hooks/use-sign-out";

const ITEM = "min-h-11 gap-3 px-3 text-body [&_svg]:text-muted-foreground";

/** The first letter of the name, else of the email: what the account button shows. */
function initialOf({ name, email }: Account): string {
  return (name.trim() || email).charAt(0).toUpperCase();
}

/**
 * Who is signed in, Settings and Sign out, top right of the main screen and onboarding.
 *
 * It takes the place of the iOS app's settings button: the web app has accounts, and
 * sign-out tucked inside Settings was hard to find, and missing from onboarding entirely.
 */
export function AccountMenu() {
  const account = useAccount();
  const { signOut, pending, failed } = useSignOut();
  const name = account.name.trim();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* The icon size: the default size's side padding left the circle 22px wide. */}
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Account, ${account.email}`}
          className="size-11 rounded-full hover:bg-muted"
          data-testid="account-menu"
        >
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-callout font-semibold text-primary"
          >
            {initialOf(account)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-xl p-1.5">
        <DropdownMenuLabel className="px-3 py-2 font-normal">
          {name === "" ? null : (
            <span className="block truncate text-callout font-semibold text-foreground">
              {name}
            </span>
          )}
          <span className="block truncate text-footnote text-muted-foreground">
            {account.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className={ITEM}>
          <Link href="/settings">
            <Settings aria-hidden />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className={ITEM}
          disabled={pending}
          onSelect={(event) => {
            // Kept open while signing out, so a failure can be told here.
            event.preventDefault();
            void signOut();
          }}
        >
          <LogOut aria-hidden />
          {pending ? "Signing out..." : failed ? "Retry sign out" : "Sign out"}
        </DropdownMenuItem>
        {failed ? (
          <p
            role="alert"
            className="px-3 pt-1 pb-2 text-footnote text-destructive"
          >
            Couldn&apos;t sign out. Check your connection and try again.
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
