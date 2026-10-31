"use client";

import {
  acceptRequest,
  cancelRequest,
  declineRequest,
} from "@/actions/friends";
import { Button } from "@/components/ui/button";
import type {
  FriendProfile,
  PublicHandle,
} from "@/features/friends/domain/types";
import { useFriendAction } from "@/features/friends/hooks/use-friend-action";

import { PersonRow } from "./person-row";

/** Incoming requests as rows with Accept and Decline. The caller frames the list. */
export function IncomingRequestList({
  incoming,
}: {
  incoming: readonly FriendProfile[];
}) {
  return (
    <ul className="divide-y">
      {incoming.map((person) => (
        <li key={person.userId}>
          <IncomingRow person={person} />
        </li>
      ))}
    </ul>
  );
}

function IncomingRow({ person }: { person: FriendProfile }) {
  const { run, pending, error } = useFriendAction();
  const target = { userId: person.userId };
  return (
    <PersonRow
      username={person.username}
      name={person.name}
      image={person.image}
      error={error}
      stackActions
    >
      <Button
        size="lg"
        className="px-3"
        disabled={pending}
        onClick={() => run(() => acceptRequest(target))}
      >
        Accept
      </Button>
      <Button
        variant="secondary"
        size="lg"
        className="px-3"
        disabled={pending}
        onClick={() => run(() => declineRequest(target))}
      >
        Decline
      </Button>
    </PersonRow>
  );
}

/** Requests the reader sent, as handles only, each with Cancel. The caller frames the list. */
export function SentRequestList({
  outgoing,
}: {
  outgoing: readonly PublicHandle[];
}) {
  return (
    <ul className="divide-y">
      {outgoing.map((handle) => (
        <li key={handle.userId}>
          <SentRow handle={handle} />
        </li>
      ))}
    </ul>
  );
}

function SentRow({ handle }: { handle: PublicHandle }) {
  const { run, pending, error } = useFriendAction();
  return (
    <PersonRow username={handle.username} error={error}>
      <Button
        variant="secondary"
        size="lg"
        className="px-3"
        disabled={pending}
        onClick={() => run(() => cancelRequest({ userId: handle.userId }))}
      >
        Cancel
      </Button>
    </PersonRow>
  );
}
