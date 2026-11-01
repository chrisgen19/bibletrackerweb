"use client";

import { Check, HandHeart } from "lucide-react";
import { useState } from "react";

import { nudgeFriend } from "@/actions/friends";
import { Button } from "@/components/ui/button";

import { friendsErrorMessage } from "../../commands/results";
import { firstName } from "../../domain/nudge";
import type { FriendProfile } from "../../domain/types";
import { useFriendNudgeState } from "../../hooks/friend-reading-provider";

/** Refusals that mean the cheer is (or no longer needs to be) settled: keep the confirmation. */
const SETTLED = new Set(["already-nudged", "already-read", "not-found"]);

/**
 * Cheers a friend on, once per friend's day. Switches to the confirmation at once and
 * reverts with a message if sending fails. Remount it (key) when the friend's day changes.
 */
export function CheerButton({ friend }: { friend: FriendProfile }) {
  const { nudgedToday, refresh } = useFriendNudgeState();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = firstName(friend);

  async function cheer() {
    if (sent) return;
    setSent(true);
    setError(null);
    try {
      const result = await nudgeFriend({ userId: friend.userId });
      if (result.ok || SETTLED.has(result.error)) {
        refresh();
        return;
      }
      setSent(false);
      setError(friendsErrorMessage(result.error));
    } catch {
      setSent(false);
      setError(friendsErrorMessage("network"));
    }
  }

  if (nudgedToday || sent) {
    return (
      <p className="mt-4 flex items-center gap-2 rounded-xl bg-secondary px-4 py-3 text-callout text-muted-foreground">
        <Check className="size-4 shrink-0" aria-hidden />
        <span className="truncate">You cheered {name} on today</span>
      </p>
    );
  }

  return (
    <div className="mt-4">
      <Button size="large" className="w-full" onClick={cheer}>
        <HandHeart className="size-5 shrink-0" aria-hidden />
        <span className="truncate">Cheer {name} on</span>
      </Button>
      {error !== null && (
        <p role="alert" className="mt-2 text-footnote text-muted-foreground">
          {error}
        </p>
      )}
    </div>
  );
}
