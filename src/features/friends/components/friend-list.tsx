"use client";

import { Ellipsis, Users } from "lucide-react";
import { useState } from "react";

import { removeFriend } from "@/actions/friends";
import { EmptyState } from "@/components/empty-state";
import { Panel } from "@/components/panel";
import { SectionHeader } from "@/components/section-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FriendProfile } from "@/features/friends/domain/types";
import { useFriendAction } from "@/features/friends/hooks/use-friend-action";

import { PersonRow } from "./person-row";

/** Friends, with an empty state that says how to find some. */
export function FriendList({ friends }: { friends: readonly FriendProfile[] }) {
  return (
    <section>
      <SectionHeader title="Friends" />
      <Panel padded={friends.length > 0 ? false : undefined}>
        {friends.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No friends yet"
            description="Share your invite link or search for a username."
            compact
          />
        ) : (
          <ul className="divide-y">
            {friends.map((friend) => (
              <li key={friend.userId}>
                <FriendRow friend={friend} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </section>
  );
}

function FriendRow({ friend }: { friend: FriendProfile }) {
  const { run, pending, error } = useFriendAction();
  const [confirming, setConfirming] = useState(false);
  return (
    <PersonRow
      username={friend.username}
      name={friend.name}
      image={friend.image}
      error={error}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={`Options for ${friend.name}`}
            disabled={pending}
          >
            <Ellipsis aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setConfirming(true)}
          >
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove @{friend.username}?</AlertDialogTitle>
            <AlertDialogDescription>They won't be told.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => run(() => removeFriend({ userId: friend.userId }))}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PersonRow>
  );
}
