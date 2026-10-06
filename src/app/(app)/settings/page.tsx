import type { Metadata } from "next";

import { SettingsScreen } from "@/features/settings/components/settings-screen";
import { readAppearanceCookie } from "@/lib/appearance-cookie";
import { getAppearancePreference } from "@/lib/dal";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  // This device's choice, else the account's: what the page is rendering right now.
  const appearance =
    (await readAppearanceCookie()) ?? (await getAppearancePreference(user.id));
  return <SettingsScreen appearance={appearance} email={user.email} />;
}
