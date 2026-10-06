import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { oauthErrorMessage } from "@/features/auth/auth-error-message";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { firstParam, safeNextPath } from "@/features/auth/safe-next-path";
import { googleSignInEnabled } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const params = await searchParams;
  const next = safeNextPath(firstParam(params.next));

  // The proxy only sees that a cookie exists; this checks the session is real before
  // skipping sign-in, so an expired cookie cannot cause a redirect loop.
  if ((await getCurrentUser()) !== null) redirect(next);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Sign in</CardTitle>
        <CardDescription>
          Pick up your reading where you left off.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {firstParam(params.oauth) === "failed" ? (
          <p role="alert" className="text-sm text-destructive">
            {oauthErrorMessage(firstParam(params.error))}
          </p>
        ) : null}
        <SignInForm next={next} googleEnabled={googleSignInEnabled} />
      </CardContent>
    </Card>
  );
}
