import "server-only";

import { usernameSchema } from "@/features/friends/domain/username";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineAllFriendRequests,
  declineFriendRequest,
  findInviteOwner,
  findUserByUsername,
  getOrCreateInvite,
  getRelationship,
  getUsername,
  removeFriend,
  resetInvite,
  sendFriendRequest,
  setUsername,
} from "@/lib/friends-dal";

import {
  inviteInput,
  searchInput,
  setUsernameInput,
  targetInput,
} from "./inputs";
import type {
  FriendsErrorCode,
  FriendsResult,
  InviteCodeResult,
  SearchResult,
} from "./results";

/**
 * The friends commands behind the Server Actions in src/actions/friends.ts.
 *
 * They take an already-authenticated `userId` so they can be tested without a request.
 * Input is parsed again here because an action is a public endpoint.
 */

const OK = { ok: true } as const;

function fail(error: FriendsErrorCode): { ok: false; error: FriendsErrorCode } {
  return { ok: false, error };
}

/** Saves the reader's username. Choosing your own current one is a no-op success. */
export async function setUsernameFor(
  userId: string,
  input: unknown,
): Promise<FriendsResult> {
  const parsed = setUsernameInput.safeParse(input);
  if (!parsed.success) return fail("invalid-input");
  const { username } = parsed.data;

  const holder = await findUserByUsername(username);
  if (holder !== null && holder.userId !== userId) {
    return fail("username-taken");
  }
  if ((await setUsername(userId, username)) === "taken") {
    return fail("username-just-taken");
  }
  return OK;
}

/** Exact-handle search. A query that cannot be a username finds nobody, unqueried. */
export async function searchUsernameFor(
  userId: string,
  input: unknown,
): Promise<SearchResult> {
  const parsed = searchInput.safeParse(input);
  if (!parsed.success) return fail("invalid-input");
  // Longer than any handle (and than the input allows): nobody, not an error.
  if (parsed.data.query.length > 64) return { ok: true, match: null };
  const name = usernameSchema.safeParse(parsed.data.query);
  if (!name.success) return { ok: true, match: null };

  const handle = await findUserByUsername(name.data);
  if (handle === null) return { ok: true, match: null };
  const relationship = await getRelationship(userId, handle.userId);
  return { ok: true, match: { handle, relationship } };
}

/** Sending needs the sender to have a handle, and a target who is someone else. */
async function sendTo(
  userId: string,
  targetId: string,
): Promise<FriendsResult> {
  if ((await getUsername(userId)) === null) return fail("username-required");
  if (targetId === userId) return fail("self");
  // A reader with no username is invisible to others, so a request would be a hidden row.
  if ((await getUsername(targetId)) === null) return fail("not-found");
  const outcome = await sendFriendRequest(userId, targetId);
  switch (outcome) {
    case "requested":
    case "accepted":
    case "already-requested":
    case "already-friends":
      return OK;
    default:
      return fail(outcome);
  }
}

export async function sendRequestFor(
  userId: string,
  input: unknown,
): Promise<FriendsResult> {
  const parsed = targetInput.safeParse(input);
  if (!parsed.success) return fail("invalid-input");
  return sendTo(userId, parsed.data.userId);
}

export async function sendRequestByInviteFor(
  userId: string,
  input: unknown,
): Promise<FriendsResult> {
  const parsed = inviteInput.safeParse(input);
  if (!parsed.success) return fail("invalid-input");
  if ((await getUsername(userId)) === null) return fail("username-required");
  const owner = await findInviteOwner(parsed.data.code);
  if (owner === null) return fail("not-found");
  return sendTo(userId, owner.userId);
}

export async function acceptRequestFor(
  userId: string,
  input: unknown,
): Promise<FriendsResult> {
  const parsed = targetInput.safeParse(input);
  if (!parsed.success) return fail("invalid-input");
  const outcome = await acceptFriendRequest(userId, parsed.data.userId);
  return outcome === "accepted" ? OK : fail(outcome);
}

/** Declining, cancelling and removing differ only in the DAL call; gone is not-found. */
function deletion(
  remove: (userId: string, otherUserId: string) => Promise<boolean>,
) {
  return async (userId: string, input: unknown): Promise<FriendsResult> => {
    const parsed = targetInput.safeParse(input);
    if (!parsed.success) return fail("invalid-input");
    return (await remove(userId, parsed.data.userId)) ? OK : fail("not-found");
  };
}

export const declineRequestFor = deletion(declineFriendRequest);
export const cancelRequestFor = deletion(cancelFriendRequest);
export const removeFriendFor = deletion(removeFriend);

/** Declines everything waiting; having nothing waiting is still a success. */
export async function declineAllRequestsFor(
  userId: string,
): Promise<FriendsResult> {
  await declineAllFriendRequests(userId);
  return OK;
}

export async function getInviteCodeFor(
  userId: string,
): Promise<InviteCodeResult> {
  if ((await getUsername(userId)) === null) return fail("username-required");
  return { ok: true, code: await getOrCreateInvite(userId) };
}

export async function resetInviteFor(
  userId: string,
): Promise<InviteCodeResult> {
  if ((await getUsername(userId)) === null) return fail("username-required");
  return { ok: true, code: await resetInvite(userId) };
}
