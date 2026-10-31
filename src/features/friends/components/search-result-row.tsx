import { acceptRequest, cancelRequest, sendRequest } from "@/actions/friends";
import { Button } from "@/components/ui/button";
import type {
  FriendsResult,
  SearchMatch,
} from "@/features/friends/commands/results";

import { PersonRow } from "./person-row";

interface SearchResultRowProps {
  match: SearchMatch | null;
  error: string | null;
  pending: boolean;
  act: (call: () => Promise<FriendsResult>) => Promise<void>;
}

export function SearchResultRow({
  match,
  error,
  pending,
  act,
}: SearchResultRowProps) {
  if (match === null) {
    return <Note>No one with that username</Note>;
  }
  const { handle, relationship } = match;
  if (relationship === "self") return <Note>That's you</Note>;
  const target = { userId: handle.userId };
  return (
    <PersonRow username={handle.username} error={error}>
      {relationship === "none" ? (
        <Button
          size="lg"
          className="px-4"
          disabled={pending}
          onClick={() => act(() => sendRequest(target))}
        >
          Add
        </Button>
      ) : null}
      {relationship === "incoming" ? (
        <Button
          size="lg"
          className="px-4"
          disabled={pending}
          onClick={() => act(() => acceptRequest(target))}
        >
          Accept
        </Button>
      ) : null}
      {relationship === "outgoing" ? (
        <>
          <span className="text-callout text-muted-foreground">Requested</span>
          <Button
            variant="secondary"
            size="lg"
            className="px-3"
            disabled={pending}
            onClick={() => act(() => cancelRequest(target))}
          >
            Cancel
          </Button>
        </>
      ) : null}
      {relationship === "friends" ? (
        <span className="text-callout text-muted-foreground">Friends</span>
      ) : null}
    </PersonRow>
  );
}

function Note({ children }: { children: string }) {
  return (
    <p className="px-4 py-4 text-callout text-muted-foreground">{children}</p>
  );
}
