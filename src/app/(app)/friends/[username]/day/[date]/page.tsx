import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Panel } from "@/components/panel";
import { FriendDayDetail } from "@/features/friends/components/friend-profile/friend-day-detail";
import { FriendReadingProvider } from "@/features/friends/hooks/friend-reading-provider";
import { getActiveReadingPlan } from "@/lib/dal";
import { getFriendReading } from "@/lib/friends-dal";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Day" };

/** A friend's day on its own page: a direct load or refresh of a link the sheet opened. */
export default async function FriendDayPage({
  params,
}: PageProps<"/friends/[username]/day/[date]">) {
  const user = await requireUser();
  if ((await getActiveReadingPlan(user.id)) === null) redirect("/onboarding");

  const { username, date } = await params;
  const lookup = await getFriendReading(user.id, username);
  // Your own day lives at /day/<date>, where you can change it.
  if (lookup.kind === "self") redirect(`/day/${date}`);
  if (lookup.kind === "not-found") notFound();

  return (
    <main className="mx-auto w-full max-w-lg px-5 pt-4 pb-tab-bar">
      <Link
        href={`/friends/${lookup.profile.username}`}
        className="-ml-2 mb-3 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-callout text-primary outline-none hover:bg-primary-soft focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {lookup.profile.name}
      </Link>
      <Panel>
        <FriendReadingProvider
          username={lookup.profile.username}
          initial={lookup.reading}
        >
          <FriendDayDetail date={date} heading="page" />
        </FriendReadingProvider>
      </Panel>
    </main>
  );
}
