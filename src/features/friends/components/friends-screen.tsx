import { Panel } from "@/components/panel";
import { SectionHeader } from "@/components/section-header";
import type { FriendsOverview } from "@/features/friends/domain/types";

import { FriendList } from "./friend-list";
import { InviteLinkPanel } from "./invite-link-panel";
import { IncomingRequests, SentRequests } from "./request-lists";
import { UsernameSetup } from "./username-form";
import { UsernameHeader } from "./username-header";
import { UsernameSearch } from "./username-search";

interface FriendsScreenProps {
  /** `null` until the reader picks one, which is the only thing the screen asks first. */
  username: string | null;
  inviteUrl: string | null;
  overview: FriendsOverview;
}

/** Reading with friends: invite, find, answer requests, and the friends themselves. */
export function FriendsScreen({
  username,
  inviteUrl,
  overview,
}: FriendsScreenProps) {
  if (username === null || inviteUrl === null) {
    return (
      <main className="mx-auto w-full max-w-lg px-5 pt-6 pb-tab-bar">
        <h1 className="text-large-title">Friends</h1>
        <section className="mt-6">
          <SectionHeader title="Pick a username" />
          <Panel>
            <UsernameSetup />
          </Panel>
        </section>
      </main>
    );
  }
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-5 pt-6 pb-tab-bar">
      <UsernameHeader username={username} />
      <section>
        <SectionHeader title="Your invite link" />
        <InviteLinkPanel inviteUrl={inviteUrl} />
      </section>
      <section>
        <SectionHeader title="Find by username" />
        <UsernameSearch />
      </section>
      <IncomingRequests incoming={overview.incoming} />
      <SentRequests outgoing={overview.outgoing} />
      <FriendList friends={overview.friends} />
    </main>
  );
}
