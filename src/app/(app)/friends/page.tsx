import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FriendsScreen } from "@/features/friends/components/friends-screen";
import { getActiveReadingPlan } from "@/lib/dal";
import { env } from "@/lib/env";
import {
  getFriendsOverview,
  getOrCreateInvite,
  getUsername,
} from "@/lib/friends-dal";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Friends" };

export default async function FriendsPage() {
  const user = await requireUser();
  if ((await getActiveReadingPlan(user.id)) === null) redirect("/onboarding");

  const username = await getUsername(user.id);
  if (username === null) {
    return (
      <FriendsScreen
        username={null}
        inviteUrl={null}
        overview={{ friends: [], incoming: [], outgoing: [] }}
      />
    );
  }
  const [overview, code] = await Promise.all([
    getFriendsOverview(user.id),
    getOrCreateInvite(user.id),
  ]);
  const inviteUrl = new URL(`/add/${code}`, env.BETTER_AUTH_URL).href;
  return (
    <FriendsScreen
      username={username}
      inviteUrl={inviteUrl}
      overview={overview}
    />
  );
}
