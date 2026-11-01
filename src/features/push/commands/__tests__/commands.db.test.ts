import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { createTestUser } from "@/test/factories";
import { createId } from "@/utils/id";

import {
  deletePushSubscriptionFor,
  refreshPushSubscriptionFor,
  savePushSubscriptionFor,
} from "../commands";

const DAY_MS = 24 * 60 * 60 * 1000;

/** A session row for `userId` (Better Auth owns real ones; the commands only reference them). */
async function createTestSession(userId: string): Promise<string> {
  const id = createId();
  await db.session.create({
    data: {
      id,
      token: createId(),
      userId,
      expiresAt: new Date(Date.now() + DAY_MS),
    },
  });
  return id;
}

const input = (endpoint: string, p256dh = "p256dh-key", auth = "auth-key") => ({
  endpoint,
  keys: { p256dh, auth },
});

let userId: string;
let sessionId: string;
let endpoint: string;

beforeEach(async () => {
  userId = await createTestUser();
  sessionId = await createTestSession(userId);
  endpoint = `https://fcm.googleapis.com/fcm/send/${createId()}`;
});

describe("savePushSubscriptionFor", () => {
  it("saves a valid subscription", async () => {
    expect(
      await savePushSubscriptionFor(userId, sessionId, input(endpoint), "UA/1"),
    ).toEqual({ ok: true });
    const row = await db.pushSubscription.findUnique({ where: { endpoint } });
    expect(row).toMatchObject({ userId, sessionId, userAgent: "UA/1" });
  });

  it("rejects a non-https endpoint as invalid-input", async () => {
    const http = "http://fcm.googleapis.com/abc";
    expect(
      await savePushSubscriptionFor(userId, sessionId, input(http), null),
    ).toEqual({ ok: false, error: "invalid-input" });
    expect(await db.pushSubscription.count({ where: { endpoint: http } })).toBe(
      0,
    );
  });
});

describe("savePushSubscriptionFor endpoint host", () => {
  it("rejects a non push-service endpoint as invalid-input and stores nothing", async () => {
    const other = "https://push.example.test/abc";
    expect(
      await savePushSubscriptionFor(userId, sessionId, input(other), null),
    ).toEqual({ ok: false, error: "invalid-input" });
    expect(
      await db.pushSubscription.count({ where: { endpoint: other } }),
    ).toBe(0);
  });
});

describe("refreshPushSubscriptionFor", () => {
  it("refresh reports current only for the same session", async () => {
    await savePushSubscriptionFor(userId, sessionId, input(endpoint), null);
    const other = await createTestSession(userId);
    expect(
      await refreshPushSubscriptionFor(sessionId, input(endpoint, "new", "k")),
    ).toEqual({ ok: true, current: true });
    expect(await refreshPushSubscriptionFor(other, input(endpoint))).toEqual({
      ok: true,
      current: false,
    });
    expect(await refreshPushSubscriptionFor(sessionId, { endpoint })).toEqual({
      ok: false,
      error: "invalid-input",
    });
  });
});

describe("deletePushSubscriptionFor", () => {
  it("deletes the caller's own endpoint", async () => {
    await savePushSubscriptionFor(userId, sessionId, input(endpoint), null);
    expect(await deletePushSubscriptionFor(userId, { endpoint })).toEqual({
      ok: true,
    });
    expect(await db.pushSubscription.count({ where: { endpoint } })).toBe(0);
  });

  it("delete of someone else's endpoint is not-found", async () => {
    await savePushSubscriptionFor(userId, sessionId, input(endpoint), null);
    const stranger = await createTestUser();
    expect(await deletePushSubscriptionFor(stranger, { endpoint })).toEqual({
      ok: false,
      error: "not-found",
    });
    expect(await db.pushSubscription.count({ where: { endpoint } })).toBe(1);
  });
});
