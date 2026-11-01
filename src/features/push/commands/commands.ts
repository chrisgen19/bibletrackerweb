import "server-only";

import type { PushResult, RefreshResult } from "@/features/push/domain/types";
import {
  deletePushSubscription,
  refreshPushSubscription,
  savePushSubscription,
} from "@/lib/push-dal";

import { endpointInput, pushSubscriptionInput } from "./inputs";

/**
 * The push commands behind the Server Actions in src/actions/push.ts.
 *
 * They take an already-authenticated `userId` and `sessionId` so they can be tested
 * without a request. Input is parsed again here because an action is a public endpoint.
 */

/** Saves this device's subscription under the login session, claiming the endpoint. */
export async function savePushSubscriptionFor(
  userId: string,
  sessionId: string,
  input: unknown,
  userAgent: string | null,
): Promise<PushResult> {
  const parsed = pushSubscriptionInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid-input" };
  await savePushSubscription(userId, sessionId, parsed.data, userAgent);
  return { ok: true };
}

/** Updates rotated keys; `current` is false when this session does not own the endpoint. */
export async function refreshPushSubscriptionFor(
  sessionId: string,
  input: unknown,
): Promise<RefreshResult> {
  const parsed = pushSubscriptionInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid-input" };
  const current = await refreshPushSubscription(sessionId, parsed.data);
  return { ok: true, current };
}

/** Removes the caller's own subscription; `not-found` when nothing was deleted. */
export async function deletePushSubscriptionFor(
  userId: string,
  input: unknown,
): Promise<PushResult> {
  const parsed = endpointInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid-input" };
  const deleted = await deletePushSubscription(userId, parsed.data.endpoint);
  return deleted ? { ok: true } : { ok: false, error: "not-found" };
}
