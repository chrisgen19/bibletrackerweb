"use client";

import { UserPlus } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import type { FriendsOverview } from "@/features/friends/domain/types";
import { useUrlFlag } from "@/features/friends/hooks/use-url-flag";

import { AddFriendsSheet } from "./add-friends-sheet";
import { FriendList } from "./friend-list";
import { RequestsBanner } from "./requests-banner";

interface FriendsHubProps {
  username: string;
  inviteUrl: string;
  overview: FriendsOverview;
}

/**
 * The friends list is the screen. Requests wait in one banner above it, and everything for
 * adding people sits in a sheet behind the header button (`?sheet=add` keeps it open
 * across a refresh, and makes "send your link" linkable).
 */
export function FriendsHub({ username, inviteUrl, overview }: FriendsHubProps) {
  const [adding, setAdding] = useUrlFlag("sheet", "add");
  const addButton = useRef<HTMLButtonElement>(null);
  const count = overview.friends.length;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-5 px-5 pt-6 pb-tab-bar">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-large-title">Friends</h1>
          <p className="text-callout text-muted-foreground">
            {count === 0
              ? "Read alongside people you know"
              : `${count} ${count === 1 ? "friend" : "friends"}`}
          </p>
        </div>
        <Button
          ref={addButton}
          size="medium"
          className="px-4"
          aria-haspopup="dialog"
          onClick={() => setAdding(true)}
        >
          <UserPlus aria-hidden className="size-[18px]" />
          Add friends
        </Button>
      </header>

      <RequestsBanner incoming={overview.incoming} />
      <FriendList friends={overview.friends} onAdd={() => setAdding(true)} />

      <AddFriendsSheet
        open={adding}
        onOpenChange={setAdding}
        username={username}
        inviteUrl={inviteUrl}
        outgoing={overview.outgoing}
        returnFocusRef={addButton}
      />
    </main>
  );
}
