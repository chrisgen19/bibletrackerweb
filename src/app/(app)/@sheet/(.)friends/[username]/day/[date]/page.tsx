import { SheetTitle } from "@/components/ui/sheet";
import { FriendDayDetail } from "@/features/friends/components/friend-profile/friend-day-detail";
import { FriendUnavailable } from "@/features/friends/components/friend-profile/friend-unavailable";
import { FriendReadingProvider } from "@/features/friends/hooks/friend-reading-provider";
import { DaySheet } from "@/features/progress/components/day-detail/day-sheet";
import { getFriendReading } from "@/lib/friends-dal";
import { requireUser } from "@/lib/session";

/**
 * A friend's day opened from their profile: a view-only sheet over it. Someone who is not
 * an accepted friend (the friendship ended while the profile was open) gets the sheet with
 * the unavailable state, not stale data and not a silent URL change; it reveals nothing
 * the profile page's 404 does not. The reader's own day has no sheet here.
 */
export default async function InterceptedFriendDay({
  params,
}: PageProps<"/friends/[username]/day/[date]">) {
  const user = await requireUser();
  const { username, date } = await params;
  const lookup = await getFriendReading(user.id, username);
  if (lookup.kind === "self") return null;
  if (lookup.kind === "not-found") {
    return (
      <DaySheet>
        {/* The dialog needs a name; the unavailable state has no heading of its own. */}
        <SheetTitle className="sr-only">Profile unavailable</SheetTitle>
        <FriendUnavailable />
      </DaySheet>
    );
  }

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
