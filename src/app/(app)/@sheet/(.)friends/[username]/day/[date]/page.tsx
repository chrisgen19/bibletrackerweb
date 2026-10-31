import { FriendDayDetail } from "@/features/friends/components/friend-profile/friend-day-detail";
import { FriendReadingProvider } from "@/features/friends/hooks/friend-reading-provider";
import { DaySheet } from "@/features/progress/components/day-detail/day-sheet";
import { getFriendReading } from "@/lib/friends-dal";
import { requireUser } from "@/lib/session";

/**
 * A friend's day opened from their profile: a view-only sheet over it. Anyone who is not
 * an accepted friend gets no sheet, the same as the profile page's 404 reveals nothing.
 */
export default async function InterceptedFriendDay({
  params,
}: PageProps<"/friends/[username]/day/[date]">) {
  const user = await requireUser();
  const { username, date } = await params;
  const lookup = await getFriendReading(user.id, username);
  if (lookup.kind !== "friend") return null;

  return (
    <DaySheet>
      <FriendReadingProvider
        username={lookup.profile.username}
        initial={lookup.reading}
      >
        <FriendDayDetail date={date} heading="sheet" />
      </FriendReadingProvider>
    </DaySheet>
  );
}
