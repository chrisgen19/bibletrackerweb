import type { Metadata } from "next";

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
  // A failed "Connect Google" comes back as ?google=failed&error=<code>.
  const google = googleSignInEnabled
    ? {
        linked: await hasGoogleAccount(),
        error:
          firstParam(params.google) === "failed"
            ? (firstParam(params.error) ?? "unknown")
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
