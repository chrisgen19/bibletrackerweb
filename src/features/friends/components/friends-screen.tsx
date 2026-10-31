import { Panel } from "@/components/panel";
import type { FriendsOverview } from "@/features/friends/domain/types";

import { FriendsHub } from "./friends-hub";
import { UsernameSetup } from "./username-form";

interface FriendsScreenProps {
  userId: string;
  /** `null` until the reader picks one, which is the only thing the screen asks first. */
  username: string | null;
  inviteUrl: string | null;
  overview: FriendsOverview;
}

/** Reading with friends: a username first, then the friends hub. */
export function FriendsScreen({
  userId,
  username,
  inviteUrl,
  overview,
}: FriendsScreenProps) {
  if (username === null || inviteUrl === null) {
    return (
      <main className="mx-auto w-full max-w-lg px-5 pt-6 pb-tab-bar">
        <h1 className="text-large-title">Friends</h1>
        <p className="mt-1 text-callout text-muted-foreground">
          Pick a username so friends can find you. You can change it later.
        </p>
        <Panel className="mt-6">
          <UsernameSetup userId={userId} />
        </Panel>
      </main>
    );
  }
  return (
    <FriendsHub username={username} inviteUrl={inviteUrl} overview={overview} />
  );
}
