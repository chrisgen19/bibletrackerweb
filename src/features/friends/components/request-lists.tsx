"use client";

import {
  acceptRequest,
  cancelRequest,
  declineRequest,
} from "@/actions/friends";
import { Panel } from "@/components/panel";
import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";
import {
  DECLINE_ALL_THRESHOLD,
  type FriendProfile,
  type PublicHandle,
} from "@/features/friends/domain/types";
import { useFriendAction } from "@/features/friends/hooks/use-friend-action";

import { DeclineAllButton } from "./decline-all-button";
import { PersonRow } from "./person-row";

/** Incoming requests. Renders nothing when there are none. */
export function IncomingRequests({
  incoming,
}: {
  incoming: readonly FriendProfile[];
}) {
  if (incoming.length === 0) return null;
  return (
    <section>
      <SectionHeader
        title="Requests"
        accessory={
          incoming.length > DECLINE_ALL_THRESHOLD ? (
            <DeclineAllButton count={incoming.length} />
          ) : undefined
        }
      />
      <Panel padded={false}>
        <ul className="divide-y">
          {incoming.map((person) => (
            <li key={person.userId}>
              <IncomingRow person={person} />
            </li>
          ))}
        </ul>
      </Panel>
    </section>
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

/** Requests the reader sent, as handles only. Renders nothing when there are none. */
export function SentRequests({
  outgoing,
}: {
  outgoing: readonly PublicHandle[];
}) {
  if (outgoing.length === 0) return null;
  return (
    <section>
      <SectionHeader title="Sent" />
      <Panel padded={false}>
        <ul className="divide-y">
          {outgoing.map((handle) => (
            <li key={handle.userId}>
              <SentRow handle={handle} />
            </li>
          ))}
        </ul>
      </Panel>
    </section>
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
