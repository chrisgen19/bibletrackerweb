"use client";

import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useCallback, useMemo } from "react";

import { FriendUnavailable } from "@/features/friends/components/friend-profile/friend-unavailable";
import type { FriendReading } from "@/features/friends/domain/types";
import { deriveReadingView } from "@/features/reading-plan/domain/reading-view";
import { ReadingViewProvider } from "@/features/reading-plan/hooks/reading-view-context";
import type { DateKey } from "@/utils/date-key";

/** The friend's reading is gone for this viewer: unfriended, or never accepted. */
class FriendGoneError extends Error {}

async function fetchFriendReading(username: string): Promise<FriendReading> {
  const response = await fetch(
    `/api/friends/${encodeURIComponent(username)}/reading`,
    { cache: "no-store" },
  );
  if (response.status === 404) throw new FriendGoneError();
  if (!response.ok) {
    throw new Error(`Friend reading request failed: ${response.status}`);
  }
  return (await response.json()) as FriendReading;
}

interface FriendReadingProviderProps {
  username: string;
  /** What the server rendered, so mounting does not fetch it again. */
  initial: FriendReading;
  /** Shown once the friendship has ended. Defaults to {@link FriendUnavailable}. */
  unavailable?: ReactNode;
  children: ReactNode;
}

/**
 * How often an open, visible profile refetches. The server works out the friend's "today",
 * so this is what moves it on past the friend's midnight while nobody touches the page
 * (the client does not know the friend's zone). It also shows a reading as it is logged.
 */
export const FRIEND_READING_REFETCH_MS = 5 * 60_000;

/**
 * Feeds a friend's reading into the read-only view context, shadowing the reader's own
 * for everything below, so the calendar, heatmap and journal render the friend. Day links
 * stay inside the friend's profile.
 *
 * The reading is refetched when the window regains focus, and every
 * {@link FRIEND_READING_REFETCH_MS} while the tab is visible, so a friend's new reading and
 * new day show up. If that answers 404 the friendship has ended, and the profile gives way
 * to `unavailable`; a 404 is not retried.
 */
export function FriendReadingProvider({
  username,
  initial,
  unavailable = <FriendUnavailable />,
  children,
}: FriendReadingProviderProps) {
  const { data, error } = useQuery({
    queryKey: ["friend-reading", username],
    queryFn: () => fetchFriendReading(username),
    initialData: initial,
    // Always stale, so every return to the tab refetches. The server already rendered the
    // first reading, so mounting does not fetch it again.
    staleTime: 0,
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    // Paused while the tab is in the background (refetchIntervalInBackground is false).
    refetchInterval: FRIEND_READING_REFETCH_MS,
    // Dropped once the profile closes: the server-rendered `initial` of the next visit is
    // at least as fresh as anything cached, and a stale 404 must not outlive a re-friend.
    gcTime: 0,
    retry: (count, failure) =>
      !(failure instanceof FriendGoneError) && count < 3,
  });

  const view = useMemo(
    () => deriveReadingView(data.snapshot, data.today),
    [data],
  );
  const dayHref = useCallback(
    (date: DateKey) => `/friends/${username}/day/${date}`,
    [username],
  );

  if (error instanceof FriendGoneError) return unavailable;

  return (
    <ReadingViewProvider view={view} dayHref={dayHref} perspective="friend">
      {children}
    </ReadingViewProvider>
  );
}
