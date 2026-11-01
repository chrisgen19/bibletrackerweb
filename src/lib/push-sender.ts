import "server-only";

import webpush from "web-push";

import { cheerNotification } from "@/features/push/domain/notification";
import { getOpenNudges } from "@/lib/friends-dal";
import { pushConfig } from "@/lib/push-config";
import {
  deletePushSubscriptionByEndpoint,
  getLivePushSubscriptions,
  type StoredPushSubscription,
} from "@/lib/push-dal";

const TTL_SECONDS = 86_400;
// Keeps a hung push service from holding the after() work open.
const SEND_TIMEOUT_MS = 10_000;

type PushConfig = NonNullable<typeof pushConfig>;

const statusOf = (error: unknown): number | undefined =>
  typeof error === "object" && error !== null && "statusCode" in error
    ? Number((error as { statusCode: unknown }).statusCode)
    : undefined;

async function sendTo(
  subscription: StoredPushSubscription,
  payload: string,
  config: PushConfig,
): Promise<void> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      payload,
      {
        TTL: TTL_SECONDS,
        timeout: SEND_TIMEOUT_MS,
        // Per send, not at module load: web-push validates the keys when they are set.
        vapidDetails: {
          subject: config.subject,
          publicKey: config.publicKey,
          privateKey: config.privateKey,
        },
      },
    );
  } catch (error) {
    const statusCode = statusOf(error);
    if (statusCode === 404 || statusCode === 410) {
      await deletePushSubscriptionByEndpoint(subscription.endpoint);
      return;
    }
    // Status only: the endpoint and keys are credentials.
    console.error("Push failed", statusCode);
  }
}

/**
 * Pushes the current cheering title to every device of the receiver whose login session is
 * still live. Does nothing when push is not configured or no nudge is open. Devices the
 * push service reports gone (404, 410) are removed. Never throws: a failed push must not
 * break the nudge that triggered it.
 */
export async function pushCheers(
  receiverId: string,
  now: Date = new Date(),
): Promise<void> {
  if (!pushConfig) return;
  try {
    const subscriptions = await getLivePushSubscriptions(receiverId, now);
    if (subscriptions.length === 0) return;
    const { senders } = await getOpenNudges(receiverId);
    const notification = cheerNotification(senders);
    if (!notification) return;
    const payload = JSON.stringify(notification);
    await Promise.allSettled(
      subscriptions.map((s) => sendTo(s, payload, pushConfig)),
    );
  } catch (error) {
    // The error name only: messages can carry credentials.
    console.error(
      "Push failed",
      error instanceof Error ? error.name : "unknown",
    );
  }
}
