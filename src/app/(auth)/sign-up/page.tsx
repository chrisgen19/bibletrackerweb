import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { firstParam, safeNextPath } from "@/features/auth/safe-next-path";
import { googleSignInEnabled } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage({
  searchParams,
}: PageProps<"/sign-up">) {
  const params = await searchParams;
  const next = safeNextPath(firstParam(params.next));

  if ((await getCurrentUser()) !== null) redirect(next);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create an account</CardTitle>
        <CardDescription>
          Your reading history follows you across your phone and computer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm next={next} googleEnabled={googleSignInEnabled} />
      </CardContent>
    </Card>
  );
}
