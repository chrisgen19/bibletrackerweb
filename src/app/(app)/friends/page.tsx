import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FriendsScreen } from "@/features/friends/components/friends-screen";
import { getActiveReadingPlan } from "@/lib/dal";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Friends" };

export default async function FriendsPage() {
  const user = await requireUser();
  if ((await getActiveReadingPlan(user.id)) === null) redirect("/onboarding");
  return <FriendsScreen />;
}
