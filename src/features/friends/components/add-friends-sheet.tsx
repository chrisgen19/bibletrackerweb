"use client";

import { type RefObject, useId } from "react";

import { Panel } from "@/components/panel";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { PublicHandle } from "@/features/friends/domain/types";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

import { InviteLinkPanel } from "./invite-link-panel";
import { SentRequestList } from "./request-lists";
import { UsernameLine } from "./username-line";
import { UsernameSearch } from "./username-search";

interface AddFriendsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  inviteUrl: string;
  outgoing: readonly PublicHandle[];
  /** The button that opened the sheet, which gets the focus back when it closes. */
  returnFocusRef: RefObject<HTMLElement | null>;
}

/**
 * Everything for reaching new people, one tap from the list: what you share (your
 * username and invite link), a username lookup, and the requests still waiting on others.
 * From the bottom on a phone, from the right on a larger screen, like the day sheet.
 */
export function AddFriendsSheet({
  open,
  onOpenChange,
  username,
  inviteUrl,
  outgoing,
  returnFocusRef,
}: AddFriendsSheetProps) {
  const wide = useMediaQuery("(min-width: 768px)");
  const id = useId();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={wide ? "right" : "bottom"}
        aria-describedby={undefined}
        // Radix only returns focus to a SheetTrigger; this one is opened from state.
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus();
        }}
        className={cn(
          "gap-0 overflow-y-auto bg-background px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          wide ? "w-full sm:max-w-md" : "max-h-[92dvh] rounded-t-3xl",
        )}
      >
        {wide ? null : (
          <span
            aria-hidden
            className="mx-auto -mt-3 mb-4 block h-1.5 w-9 shrink-0 rounded-full bg-border-strong"
          />
        )}
        <SheetTitle className="pr-10 text-title">Add friends</SheetTitle>

        <section aria-label="Your invite link" className="mt-5">
          <InviteLinkPanel
            inviteUrl={inviteUrl}
            header={<UsernameLine username={username} />}
          />
          <p className="mt-2 px-1 text-footnote text-muted-foreground">
            Anyone with your link can send you a request. Reset it to stop new
            ones.
          </p>
        </section>

        <section aria-labelledby={`${id}-find`} className="mt-8">
          <h3 id={`${id}-find`} className="mb-2 px-1 text-headline">
            Find by username
          </h3>
          <UsernameSearch />
        </section>

        {outgoing.length === 0 ? null : (
          <section aria-labelledby={`${id}-waiting`} className="mt-8">
            <h3
              id={`${id}-waiting`}
              className="mb-2 flex items-baseline justify-between px-1 text-headline"
            >
              Waiting on{" "}
              <span className="text-footnote font-normal text-muted-foreground">
                {outgoing.length} sent
              </span>
            </h3>
            <Panel padded={false}>
              <SentRequestList outgoing={outgoing} />
            </Panel>
          </section>
        )}
      </SheetContent>
    </Sheet>
  );
}
