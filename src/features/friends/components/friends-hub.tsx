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
  // Pushed, like the day sheet: the browser's back button closes it.
  const [adding, setAdding] = useUrlFlag("sheet", "add", { history: "push" });
  const addButton = useRef<HTMLButtonElement>(null);
  // The control that opened the sheet gets the focus back when it closes.
  const opener = useRef<HTMLElement | null>(null);
  const count = overview.friends.length;

  function openFrom(trigger: Element | null) {
    // Safari does not focus a clicked button, so the active element can be the body.
    opener.current =
      trigger instanceof HTMLElement && trigger !== document.body
        ? trigger
        : null;
    setAdding(true);
  }

  /** The opener while it is still on screen, else the header button (also when the URL opened the sheet). */
  const returnFocus = () =>
    opener.current?.isConnected ? opener.current : addButton.current;

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
          onClick={(event) => openFrom(event.currentTarget)}
        >
          <UserPlus aria-hidden className="size-[18px]" />
          Add friends
        </Button>
      </header>

      <RequestsBanner incoming={overview.incoming} />
      <FriendList
        friends={overview.friends}
        onAdd={() => openFrom(document.activeElement)}
      />

      <AddFriendsSheet
        open={adding}
        onOpenChange={setAdding}
        username={username}
        inviteUrl={inviteUrl}
        outgoing={overview.outgoing}
        returnFocus={returnFocus}
      />
    </main>
  );
}
