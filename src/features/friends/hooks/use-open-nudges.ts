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
  });

  const senders = options.todayCompleted ? NO_SENDERS : data.senders;

  const dismiss = () => {
    if (senders.length === 0) return;
    const senderIds = senders.map((sender) => sender.userId);
    queryClient.setQueryData<OpenNudges>(OPEN_NUDGES_KEY, { senders: [] });
    void dismissNudges({ senderIds }).catch(() => {});
  };

  return { senders, dismiss };
}
