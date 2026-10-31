import type { Metadata } from "next";

import { InviteScreen } from "@/features/friends/components/invite-screen";
import { getActiveReadingPlan } from "@/lib/dal";
import { env } from "@/lib/env";
import {
  findInviteOwner,
  getRelationship,
  getUsername,
} from "@/lib/friends-dal";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Add friend" };

/**
 * Opening someone's invite link. Reads only: the request is sent by a tap, never by
 * loading the page. A reader with no plan yet is not redirected, so the link survives
 * sign-up; they go to onboarding after sending.
 */
export default async function AddFriendPage(props: PageProps<"/add/[code]">) {
  const { code } = await props.params;
  const user = await requireUser();

  const [owner, username, plan] = await Promise.all([
    findInviteOwner(code),
    getUsername(user.id),
    getActiveReadingPlan(user.id),
  ]);
  const relationship =
    owner === null ? "none" : await getRelationship(user.id, owner.userId);

  return (
    <main className="mx-auto w-full max-w-lg px-5 pt-4 pb-tab-bar">
      <InviteScreen
        userId={user.id}
        owner={owner}
        relationship={relationship}
        viewerHasUsername={username !== null}
        code={code}
        afterHref={plan === null ? "/onboarding" : "/friends"}
        inviteUrl={
          relationship === "self"
            ? new URL(`/add/${code}`, env.BETTER_AUTH_URL).href
            : null
        }
      />
    </main>
  );
}
