import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { FriendProfileScreen } from "@/features/friends/components/friend-profile/friend-profile-screen";
import { getActiveReadingPlan } from "@/lib/dal";
import { getFriendReading } from "@/lib/friends-dal";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Friend" };

/** A friend's profile. Anyone who is not an accepted friend is a 404, not a hint. */
export default async function FriendProfilePage({
  params,
}: PageProps<"/friends/[username]">) {
  const user = await requireUser();
  if ((await getActiveReadingPlan(user.id)) === null) redirect("/onboarding");

  const { username } = await params;
  const lookup = await getFriendReading(user.id, username);
  if (lookup.kind === "self") redirect("/");
  if (lookup.kind === "not-found") notFound();

  return (
    <FriendProfileScreen profile={lookup.profile} initial={lookup.reading} />
  );
}
