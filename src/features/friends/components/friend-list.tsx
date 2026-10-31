"use client";

import { Ellipsis, Users } from "lucide-react";
import { useState } from "react";

import { removeFriend } from "@/actions/friends";
import { EmptyState } from "@/components/empty-state";
import { Panel } from "@/components/panel";
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
import type { FriendListEntry } from "@/features/friends/domain/types";
import { useFriendAction } from "@/features/friends/hooks/use-friend-action";

import { PersonRow } from "./person-row";
import { ReadTodayMark } from "./read-today-mark";

interface FriendListProps {
  friends: readonly FriendListEntry[];
  /** Opens the Add friends sheet, from the empty state. */
  onAdd: () => void;
}

/** The friends themselves, the screen's main content, with an empty state that starts adding. */
export function FriendList({ friends, onAdd }: FriendListProps) {
  if (friends.length === 0) {
    return (
      <Panel padded={false}>
        <EmptyState
          icon={Users}
          title="No friends yet"
          description="Send someone your invite link, or look them up by username, and you can read together."
          action={{ label: "Invite a friend", onClick: onAdd }}
        />
      </Panel>
    );
  }
  return (
    <Panel padded={false}>
      <ul aria-label="Friends" className="divide-y">
        {friends.map((friend) => (
          <li key={friend.userId}>
            <FriendRow friend={friend} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function FriendRow({ friend }: { friend: FriendListEntry }) {
  const { run, pending, error } = useFriendAction();
  const [confirming, setConfirming] = useState(false);
  return (
    <PersonRow
      username={friend.username}
      name={friend.name}
      image={friend.image}
      href={`/friends/${friend.username}`}
      detail={<ReadTodayMark status={friend.readToday} />}
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
