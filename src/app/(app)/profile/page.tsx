import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileScreen } from "@/features/profile/components/profile-screen";
import { getActiveReadingPlan } from "@/lib/dal";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  if ((await getActiveReadingPlan(user.id)) === null) redirect("/onboarding");
  return <ProfileScreen />;
}
