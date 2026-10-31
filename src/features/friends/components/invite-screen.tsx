"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { cancelRequest, sendRequestByInvite } from "@/actions/friends";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { CopyShareButtons } from "@/features/friends/components/copy-share-buttons";
import { PersonRow } from "@/features/friends/components/person-row";
import { UsernameForm } from "@/features/friends/components/username-form";
import type {
  FriendProfile,
  Relationship,
} from "@/features/friends/domain/types";
import { useFriendAction } from "@/features/friends/hooks/use-friend-action";

interface InviteScreenProps {
  /** Null when the code is unknown, malformed or reset. */
  owner: FriendProfile | null;
  relationship: Relationship;
  viewerHasUsername: boolean;
  code: string;
  /** Where to go once the request is sent: onboarding for a reader with no plan yet. */
  afterHref: "/friends" | "/onboarding";
  /** The reader's own link, for the `self` state. */
  inviteUrl: string | null;
}

/** What opening someone's invite link shows. Reads only: nothing is sent until a tap. */
export function InviteScreen({
  owner,
  relationship,
  viewerHasUsername,
  code,
  afterHref,
  inviteUrl,
}: InviteScreenProps) {
  if (owner === null) {
    return (
      <Panel>
        <p className="text-headline">This invite link no longer works.</p>
        <p className="mt-1 text-callout text-muted-foreground">
          Ask your friend for a new one.
        </p>
      </Panel>
    );
  }
  if (relationship === "self") return <OwnLink inviteUrl={inviteUrl} />;
  if (relationship === "friends") {
    return (
      <Panel>
        <PersonRow
          username={owner.username}
          name={owner.name}
          image={owner.image}
        />
        <p className="px-4 pb-3 text-headline">You're already friends</p>
        <Link
          href="/friends"
          className="px-4 text-callout text-primary hover:underline"
        >
          Go to Friends
        </Link>
      </Panel>
    );
  }
  return (
    <Respond
      owner={owner}
      relationship={relationship}
      viewerHasUsername={viewerHasUsername}
      code={code}
      afterHref={afterHref}
    />
  );
}

function OwnLink({ inviteUrl }: { inviteUrl: string | null }) {
  const [copyFailed, setCopyFailed] = useState(false);
  return (
    <Panel>
      <p className="text-headline">This is your invite link</p>
      {inviteUrl === null ? null : (
        <p className="mt-3 truncate rounded-lg bg-muted px-3 py-2.5 text-callout">
          {inviteUrl}
        </p>
      )}
      {inviteUrl === null ? null : (
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyShareButtons url={inviteUrl} onCopyFailed={setCopyFailed} />
        </div>
      )}
      {copyFailed ? (
        <p role="alert" className="mt-3 text-footnote text-destructive">
          Couldn't copy. Select the link and copy it by hand.
        </p>
      ) : null}
    </Panel>
  );
}

interface RespondProps {
  owner: FriendProfile;
  relationship: Relationship;
  viewerHasUsername: boolean;
  code: string;
  afterHref: string;
}

function Respond({
  owner,
  relationship,
  viewerHasUsername,
  code,
  afterHref,
}: RespondProps) {
  const router = useRouter();
  const { run, pending, error } = useFriendAction();
  const needsUsername =
    !viewerHasUsername &&
    (relationship === "none" || relationship === "incoming");

  async function send() {
    const result = await run(() => sendRequestByInvite({ code }), {
      refresh: false,
    });
    if (result !== null) router.push(afterHref);
    return result !== null;
  }

  async function sendAfterSaving() {
    // The username is saved either way: refresh so the page drops the form and a
    // retry is the plain button.
    if (!(await send())) router.refresh();
  }

  return (
    <Panel>
      <PersonRow
        username={owner.username}
        name={owner.name}
        image={owner.image}
      />
      {relationship === "outgoing" ? (
        <div className="flex items-center justify-between gap-3 px-4 pb-3">
          <span className="text-headline">Request sent</span>
          <Button
            variant="secondary"
            size="lg"
            className="px-3"
            disabled={pending}
            onClick={() => run(() => cancelRequest({ userId: owner.userId }))}
          >
            Cancel
          </Button>
        </div>
      ) : null}
      {relationship === "incoming" && !needsUsername ? (
        <div className="px-4 pb-3">
          <Button
            size="lg"
            className="w-full"
            disabled={pending}
            onClick={send}
          >
            Accept request
          </Button>
        </div>
      ) : null}
      {relationship === "none" && !needsUsername ? (
        <div className="px-4 pb-3">
          <Button
            size="lg"
            className="w-full"
            disabled={pending}
            onClick={send}
          >
            Send friend request
          </Button>
        </div>
      ) : null}
      {needsUsername ? (
        <div className="px-4 pb-3">
          <p className="mb-3 text-callout text-muted-foreground">
            Pick a username so they can recognise you.
          </p>
          <UsernameForm
            submitLabel="Save and send request"
            onSaved={sendAfterSaving}
          />
        </div>
      ) : null}
      {error === null ? null : (
        <p role="alert" className="px-4 pb-3 text-footnote text-destructive">
          {error}
        </p>
      )}
    </Panel>
  );
}
