"use client";

import { ChevronDown } from "lucide-react";
import { Collapsible } from "radix-ui";

import {
  DECLINE_ALL_THRESHOLD,
  type FriendProfile,
} from "@/features/friends/domain/types";
import { useUrlFlag } from "@/features/friends/hooks/use-url-flag";

import { Avatar } from "./avatar";
import { DeclineAllButton } from "./decline-all-button";
import { IncomingRequestList } from "./request-lists";

const STACKED = 3;

/**
 * Incoming requests folded into one line above the friends list: who is asking, and how
 * many. Opening it (kept in the URL as `?requests=open`) shows Accept and Decline in place.
 * Renders nothing when no one is waiting.
 */
export function RequestsBanner({
  incoming,
}: {
  incoming: readonly FriendProfile[];
}) {
  const [open, setOpen] = useUrlFlag("requests", "open");
  if (incoming.length === 0) return null;
  const count = incoming.length;

  return (
    <Collapsible.Root
      asChild
      open={open}
      onOpenChange={setOpen}
      className="group/requests rounded-2xl bg-primary-soft"
    >
      <section aria-label={`Requests, ${count} pending`}>
        <Collapsible.Trigger className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <AvatarStack people={incoming} />
          <span className="min-w-0 flex-1">
            <span className="block text-headline text-primary">
              {headline(incoming)}
            </span>
            <span className="block truncate text-footnote text-muted-foreground">
              {open ? "Accept to start reading together" : names(incoming)}
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className="size-5 shrink-0 text-primary transition-transform duration-200 group-data-[state=open]/requests:rotate-180"
          />
        </Collapsible.Trigger>
        <Collapsible.Content className="px-2 pb-2">
          <div className="overflow-hidden rounded-xl bg-card">
            <IncomingRequestList incoming={incoming} />
          </div>
          {count > DECLINE_ALL_THRESHOLD ? (
            <div className="flex flex-col items-end px-2 pt-1">
              <DeclineAllButton count={count} />
            </div>
          ) : null}
        </Collapsible.Content>
      </section>
    </Collapsible.Root>
  );
}

function AvatarStack({ people }: { people: readonly FriendProfile[] }) {
  const extra = people.length - STACKED;
  return (
    <span aria-hidden className="flex shrink-0 -space-x-2.5">
      {people.slice(0, STACKED).map((person) => (
        <Avatar
          key={person.userId}
          name={person.name}
          image={person.image}
          className="size-9 bg-card text-callout ring-2 ring-primary-soft"
        />
      ))}
      {extra > 0 ? (
        <span className="flex size-9 items-center justify-center rounded-full bg-primary text-footnote font-semibold text-primary-foreground ring-2 ring-primary-soft">
          +{extra}
        </span>
      ) : null}
    </span>
  );
}

const headline = (people: readonly FriendProfile[]): string => {
  const [only] = people;
  return people.length === 1 && only !== undefined
    ? `${only.name} wants to read with you`
    : `${people.length} people want to read with you`;
};

const names = (people: readonly FriendProfile[]): string => {
  const [only] = people;
  if (people.length === 1 && only !== undefined) return `@${only.username}`;
  const shown = people.slice(0, 2).map((person) => person.name);
  const rest = people.length - shown.length;
  if (rest === 0) return shown.join(" and ");
  return `${shown.join(", ")} and ${rest} more`;
};
