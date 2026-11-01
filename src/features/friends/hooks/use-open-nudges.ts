"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { dismissNudges } from "@/actions/friends";
import type {
  FriendProfile,
  OpenNudges,
} from "@/features/friends/domain/types";

export const OPEN_NUDGES_KEY = ["open-nudges"] as const;

const NO_SENDERS: readonly FriendProfile[] = [];

async function fetchOpenNudges(): Promise<OpenNudges> {
  const response = await fetch("/api/nudges", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Open nudges request failed: ${response.status}`);
  }
  return (await response.json()) as OpenNudges;
}

/**
 * The friends cheering the reader on, for the Today screen. Seeded from the server render
 * and refetched when the window regains focus. Nobody is shown once today is completed.
 *
 * `dismiss` hides the shown senders at once and then tells the server; if that fails the
 * list stays hidden until the next refetch brings the nudges back. It does nothing when
 * no one is shown.
 */
export function useOpenNudges(
  initial: OpenNudges,
  options: { todayCompleted: boolean },
): { senders: readonly FriendProfile[]; dismiss: () => void } {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: OPEN_NUDGES_KEY,
    queryFn: fetchOpenNudges,
    initialData: initial,
    staleTime: 0,
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    // Dropped once Today unmounts: the server-rendered `initial` of the next visit is at
    // least as fresh as anything cached, so a removed friend is never named again.
    gcTime: 0,
  });

  const senders = options.todayCompleted ? NO_SENDERS : data.senders;

  const dismiss = () => {
    if (senders.length === 0) return;
    const senderIds = senders.map((sender) => sender.userId);
    // Cancel any refetch already in flight so its older answer cannot bring the row back.
    // `revert: false` keeps the cancel from restoring the pre-dismiss data; neither call
    // is awaited, so the row disappears in this tick.
    void queryClient.cancelQueries(
      { queryKey: OPEN_NUDGES_KEY },
      { revert: false },
    );
    queryClient.setQueryData<OpenNudges>(OPEN_NUDGES_KEY, { senders: [] });
    void dismissNudges({ senderIds }).catch(() => {});
  };

  return { senders, dismiss };
}
