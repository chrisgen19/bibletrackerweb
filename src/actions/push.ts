"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import * as commands from "@/features/push/commands/commands";
import type {
  EndpointInput,
  PushSubscriptionActionInput,
} from "@/features/push/commands/inputs";
import type { PushResult, RefreshResult } from "@/features/push/domain/types";
import { getCurrentSessionId, requireUser } from "@/lib/session";

// Server Actions are public POST endpoints: each one checks the session itself, and the
// commands parse their input again. The logic lives in
// src/features/push/commands/commands.ts, which is tested without a request.

const USER_AGENT_MAX = 512;

/** The signed-in user and their login session id, or a redirect to sign-in. */
async function requireUserAndSession(): Promise<{
  userId: string;
  sessionId: string;
}> {
  const user = await requireUser();
  const sessionId = await getCurrentSessionId();
  if (sessionId === null) redirect("/sign-in");
  return { userId: user.id, sessionId };
}

export async function savePushSubscription(
  input: PushSubscriptionActionInput,
): Promise<PushResult> {
  const { userId, sessionId } = await requireUserAndSession();
  const userAgent = (await headers()).get("user-agent");
  return commands.savePushSubscriptionFor(
    userId,
    sessionId,
    input,
    userAgent === null ? null : userAgent.slice(0, USER_AGENT_MAX),
  );
}

export async function refreshPushSubscription(
  input: PushSubscriptionActionInput,
): Promise<RefreshResult> {
  const { sessionId } = await requireUserAndSession();
  return commands.refreshPushSubscriptionFor(sessionId, input);
}

export async function deletePushSubscription(
  input: EndpointInput,
): Promise<PushResult> {
  const { userId } = await requireUserAndSession();
  return commands.deletePushSubscriptionFor(userId, input);
}
