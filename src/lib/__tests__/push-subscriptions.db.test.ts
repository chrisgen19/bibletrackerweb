// Push subscriptions are tied to the login session that saved them. Against the real
// test database.
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  deletePushSubscription,
  deletePushSubscriptionByEndpoint,
  getLivePushSubscriptions,
  MAX_PUSH_SUBSCRIPTIONS,
  refreshPushSubscription,
  savePushSubscription,
} from "@/lib/push-dal";
import { createTestUser } from "@/test/factories";
import { createId } from "@/utils/id";

const DAY_MS = 24 * 60 * 60 * 1000;

/** A session row for `userId` (Better Auth owns real ones; the DAL only reads them). */
async function createTestSession(
  userId: string,
  expiresAt: Date = new Date(Date.now() + DAY_MS),
): Promise<string> {
  const id = createId();
  await db.session.create({
    data: { id, token: createId(), userId, expiresAt },
  });
  return id;
}

const input = (endpoint: string, p256dh = "p256dh-key", auth = "auth-key") => ({
  endpoint,
  keys: { p256dh, auth },
});

const countByEndpoint = (endpoint: string) =>
  db.pushSubscription.count({ where: { endpoint } });

let userId: string;
let sessionId: string;
let endpoint: string;

beforeEach(async () => {
  userId = await createTestUser();
  sessionId = await createTestSession(userId);
  endpoint = `https://fcm.googleapis.com/fcm/send/${createId()}`;
});

describe("push subscriptions", () => {
  it("saves a subscription under the session", async () => {
    await savePushSubscription(userId, sessionId, input(endpoint), "UA/1");

    const row = await db.pushSubscription.findUniqueOrThrow({
      where: { endpoint },
    });
    expect(row).toMatchObject({
      userId,
      sessionId,
      p256dh: "p256dh-key",
      auth: "auth-key",
      userAgent: "UA/1",
    });
  });

  it("reassigns an existing endpoint to another user and session", async () => {
    await savePushSubscription(userId, sessionId, input(endpoint), null);
    const otherUser = await createTestUser();
    const otherSession = await createTestSession(otherUser);

    await savePushSubscription(
      otherUser,
      otherSession,
      input(endpoint, "new-p256dh", "new-auth"),
      null,
    );

    const rows = await db.pushSubscription.findMany({ where: { endpoint } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userId: otherUser,
      sessionId: otherSession,
      p256dh: "new-p256dh",
      auth: "new-auth",
    });
  });

  it("deletes the subscription when its session is deleted", async () => {
    await savePushSubscription(userId, sessionId, input(endpoint), null);

    await db.session.delete({ where: { id: sessionId } });

    expect(await countByEndpoint(endpoint)).toBe(0);
  });

  it("deletes the subscription when the user is deleted", async () => {
    await savePushSubscription(userId, sessionId, input(endpoint), null);

    await db.user.delete({ where: { id: userId } });

    expect(await countByEndpoint(endpoint)).toBe(0);
  });

  it("refreshes keys only under the same session", async () => {
    await savePushSubscription(userId, sessionId, input(endpoint), null);

    expect(
      await refreshPushSubscription(
        sessionId,
        input(endpoint, "fresh-p256dh", "fresh-auth"),
      ),
    ).toBe(true);
    expect(
      await db.pushSubscription.findUniqueOrThrow({ where: { endpoint } }),
    ).toMatchObject({ p256dh: "fresh-p256dh", auth: "fresh-auth" });

    const otherSession = await createTestSession(userId);
    expect(
      await refreshPushSubscription(
        otherSession,
        input(endpoint, "hijack-p256dh", "hijack-auth"),
      ),
    ).toBe(false);
    expect(
      await db.pushSubscription.findUniqueOrThrow({ where: { endpoint } }),
    ).toMatchObject({
      sessionId,
      p256dh: "fresh-p256dh",
      auth: "fresh-auth",
    });
  });

  it("does not count an endpoint saved under another session as current", async () => {
    const otherUser = await createTestUser();
    const otherSession = await createTestSession(otherUser);
    await savePushSubscription(
      otherUser,
      otherSession,
      input(endpoint, "other-p256dh", "other-auth"),
      null,
    );

    expect(
      await refreshPushSubscription(
        sessionId,
        input(endpoint, "mine-p256dh", "mine-auth"),
      ),
    ).toBe(false);

    expect(
      await db.pushSubscription.findUniqueOrThrow({ where: { endpoint } }),
    ).toMatchObject({
      userId: otherUser,
      sessionId: otherSession,
      p256dh: "other-p256dh",
      auth: "other-auth",
    });
  });

  it("refresh never creates a row for an unknown endpoint", async () => {
    const unknown = `https://fcm.googleapis.com/fcm/send/${createId()}`;

    expect(await refreshPushSubscription(sessionId, input(unknown))).toBe(
      false,
    );
    expect(await countByEndpoint(unknown)).toBe(0);
  });

  it("deletes only the caller's own row", async () => {
    await savePushSubscription(userId, sessionId, input(endpoint), null);
    const other = await createTestUser();

    expect(await deletePushSubscription(other, endpoint)).toBe(false);
    expect(await countByEndpoint(endpoint)).toBe(1);

    expect(await deletePushSubscription(userId, endpoint)).toBe(true);
    expect(await countByEndpoint(endpoint)).toBe(0);
  });

  it("deletes by endpoint alone", async () => {
    await savePushSubscription(userId, sessionId, input(endpoint), null);

    await deletePushSubscriptionByEndpoint(endpoint);

    expect(await countByEndpoint(endpoint)).toBe(0);
  });

  it("returns only subscriptions with a live session and removes expired ones", async () => {
    const now = new Date();
    const expiredSession = await createTestSession(
      userId,
      new Date(now.getTime() - 1000),
    );
    const expiredEndpoint = `https://fcm.googleapis.com/fcm/send/${createId()}`;
    await savePushSubscription(userId, sessionId, input(endpoint), null);
    await savePushSubscription(
      userId,
      expiredSession,
      input(expiredEndpoint),
      null,
    );

    const live = await getLivePushSubscriptions(userId, now);

    expect(live).toEqual([
      { endpoint, p256dh: "p256dh-key", auth: "auth-key" },
    ]);
    expect(await countByEndpoint(expiredEndpoint)).toBe(0);
    expect(await countByEndpoint(endpoint)).toBe(1);
  });
});

const pick = (list: readonly string[], index: number): string => {
  const value = list[index];
  if (value === undefined) throw new Error(`No seeded endpoint at ${index}`);
  return value;
};

describe("push subscription cap", () => {
  /** `count` rows for `owner`, `updatedAt` spaced a minute apart, oldest first. */
  async function seed(owner: string, session: string, count: number) {
    const base = Date.now() - 60 * 60 * 1000;
    const endpoints: string[] = [];
    for (let i = 0; i < count; i++) {
      const ep = `https://fcm.googleapis.com/fcm/send/${createId()}`;
      endpoints.push(ep);
      await db.pushSubscription.create({
        data: {
          userId: owner,
          sessionId: session,
          endpoint: ep,
          p256dh: "k",
          auth: "a",
          updatedAt: new Date(base + i * 60 * 1000),
        },
      });
    }
    return endpoints;
  }

  const countFor = (owner: string) =>
    db.pushSubscription.count({ where: { userId: owner } });

  it("keeps ten and removes the oldest when an eleventh is saved", async () => {
    const seeded = await seed(userId, sessionId, MAX_PUSH_SUBSCRIPTIONS);

    await savePushSubscription(userId, sessionId, input(endpoint), null);

    expect(await countFor(userId)).toBe(MAX_PUSH_SUBSCRIPTIONS);
    expect(await countByEndpoint(pick(seeded, 0))).toBe(0);
    expect(await countByEndpoint(pick(seeded, 1))).toBe(1);
    expect(await countByEndpoint(endpoint)).toBe(1);
  });

  it("leaves another user's rows untouched", async () => {
    const otherUser = await createTestUser();
    const otherSession = await createTestSession(otherUser);
    await seed(otherUser, otherSession, MAX_PUSH_SUBSCRIPTIONS);
    await seed(userId, sessionId, MAX_PUSH_SUBSCRIPTIONS);

    await savePushSubscription(userId, sessionId, input(endpoint), null);

    expect(await countFor(otherUser)).toBe(MAX_PUSH_SUBSCRIPTIONS);
  });

  it("removes nothing when an existing endpoint is saved again", async () => {
    const seeded = await seed(userId, sessionId, MAX_PUSH_SUBSCRIPTIONS);

    await savePushSubscription(userId, sessionId, input(pick(seeded, 0)), null);

    expect(await countFor(userId)).toBe(MAX_PUSH_SUBSCRIPTIONS);
    expect(await countByEndpoint(pick(seeded, 0))).toBe(1);
  });
});
