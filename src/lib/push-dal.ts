import "server-only";

import type { PushSubscriptionInput } from "@/features/push/domain/types";
import { db } from "@/lib/db";

export interface StoredPushSubscription {
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
}

/**
 * Stores a browser's push subscription under the login session that saved it. An endpoint
 * identifies one browser profile, so saving an existing one reassigns it (new user,
 * session and keys): a shared device follows whoever signed in last. `userId` and
 * `sessionId` must come from the same Better Auth session.
 */
export async function savePushSubscription(
  userId: string,
  sessionId: string,
  input: PushSubscriptionInput,
  userAgent: string | null,
): Promise<void> {
  const fields = {
    userId,
    sessionId,
    p256dh: input.keys.p256dh,
    auth: input.keys.auth,
    userAgent,
  };
  await db.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: { endpoint: input.endpoint, ...fields },
    update: fields,
  });
}

/**
 * Updates the keys of a subscription this session already owns, for a browser that rotated
 * them. Returns false, and never creates a row, when the endpoint is unknown or belongs to
 * another session: only saving (an explicit opt-in) may claim an endpoint.
 */
export async function refreshPushSubscription(
  sessionId: string,
  input: PushSubscriptionInput,
): Promise<boolean> {
  const { count } = await db.pushSubscription.updateMany({
    where: { endpoint: input.endpoint, sessionId },
    data: { p256dh: input.keys.p256dh, auth: input.keys.auth },
  });
  return count > 0;
}

/** Removes the caller's own subscription; false when they have no such endpoint. */
export async function deletePushSubscription(
  userId: string,
  endpoint: string,
): Promise<boolean> {
  const { count } = await db.pushSubscription.deleteMany({
    where: { userId, endpoint },
  });
  return count > 0;
}

/** Removes a subscription the push service reported gone (404 or 410). */
export async function deletePushSubscriptionByEndpoint(
  endpoint: string,
): Promise<void> {
  await db.pushSubscription.deleteMany({ where: { endpoint } });
}

/**
 * The user's subscriptions whose login session is still valid at `now`. Rows whose session
 * has expired (Better Auth leaves expired sessions in place until cleanup) are deleted in
 * the same call, so they are neither sent to nor kept.
 */
export async function getLivePushSubscriptions(
  userId: string,
  now: Date = new Date(),
): Promise<readonly StoredPushSubscription[]> {
  await db.pushSubscription.deleteMany({
    where: { userId, session: { expiresAt: { lte: now } } },
  });
  return db.pushSubscription.findMany({
    where: { userId, session: { expiresAt: { gt: now } } },
    select: { endpoint: true, p256dh: true, auth: true },
    orderBy: { createdAt: "asc" },
  });
}
