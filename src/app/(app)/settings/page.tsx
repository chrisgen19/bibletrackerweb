import type { Metadata } from "next";

import { googleLinkErrorMessage } from "@/features/auth/auth-error-message";
import { firstParam } from "@/features/auth/safe-next-path";
import { SettingsScreen } from "@/features/settings/components/settings-screen";
import { readAppearanceCookie } from "@/lib/appearance-cookie";
import { googleSignInEnabled } from "@/lib/auth";
import { getAppearancePreference } from "@/lib/dal";
import { hasGoogleAccount, requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: PageProps<"/settings">) {
  const user = await requireUser();
  const params = await searchParams;
  // This device's choice, else the account's: what the page is rendering right now.
  const appearance =
    (await readAppearanceCookie()) ?? (await getAppearancePreference(user.id));
  // A failed "Connect Google" comes back as ?google=failed&error=<code>. The code is only
  // ever a key for fixed copy, turned into words here, as the sign-in page does.
  const google = googleSignInEnabled
    ? {
        linked: await hasGoogleAccount(),
        error:
          firstParam(params.google) === "failed"
            ? googleLinkErrorMessage(firstParam(params.error) ?? "")
            : null,
      }
    : null;
  return (
    <SettingsScreen
      appearance={appearance}
      email={user.email}
      google={google}
    />
  );
}
