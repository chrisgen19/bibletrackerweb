"use server";

import * as commands from "@/features/friends/commands/commands";
import type {
  InviteInput,
  SearchInput,
  SetUsernameInput,
  TargetInput,
} from "@/features/friends/commands/inputs";
import type {
  FriendsResult,
  InviteCodeResult,
  SearchResult,
} from "@/features/friends/commands/results";
import { requireUser } from "@/lib/session";

// Server Actions are public POST endpoints: each one checks the session itself, and the
// commands parse their input again. The logic lives in
// src/features/friends/commands/commands.ts, which is tested without a request.

export async function setUsername(
  input: SetUsernameInput,
): Promise<FriendsResult> {
  const user = await requireUser();
  return commands.setUsernameFor(user.id, input);
}

export async function searchUsername(
  input: SearchInput,
): Promise<SearchResult> {
  const user = await requireUser();
  return commands.searchUsernameFor(user.id, input);
}

export async function sendRequest(input: TargetInput): Promise<FriendsResult> {
  const user = await requireUser();
  return commands.sendRequestFor(user.id, input);
}

export async function sendRequestByInvite(
  input: InviteInput,
): Promise<FriendsResult> {
  const user = await requireUser();
  return commands.sendRequestByInviteFor(user.id, input);
}

export async function acceptRequest(
  input: TargetInput,
): Promise<FriendsResult> {
  const user = await requireUser();
  return commands.acceptRequestFor(user.id, input);
}

export async function declineRequest(
  input: TargetInput,
): Promise<FriendsResult> {
  const user = await requireUser();
  return commands.declineRequestFor(user.id, input);
}

export async function cancelRequest(
  input: TargetInput,
): Promise<FriendsResult> {
  const user = await requireUser();
  return commands.cancelRequestFor(user.id, input);
}

export async function removeFriend(input: TargetInput): Promise<FriendsResult> {
  const user = await requireUser();
  return commands.removeFriendFor(user.id, input);
}

export async function declineAllRequests(): Promise<FriendsResult> {
  const user = await requireUser();
  return commands.declineAllRequestsFor(user.id);
}

export async function getInviteCode(): Promise<InviteCodeResult> {
  const user = await requireUser();
  return commands.getInviteCodeFor(user.id);
}

export async function resetInvite(): Promise<InviteCodeResult> {
  const user = await requireUser();
  return commands.resetInviteFor(user.id);
}
