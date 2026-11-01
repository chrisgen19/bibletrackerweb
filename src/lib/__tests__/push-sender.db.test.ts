// pushCheers sends the cheering title to the receiver's live devices. Real test database
// for nudges and subscriptions, mocked web-push.

import { beforeEach, describe, expect, it, vi } from "vitest";
import webpush from "web-push";
import { createReadingPlan, markReadingComplete, setTimeZone } from "@/lib/dal";
import { db } from "@/lib/db";
import {
  acceptFriendRequest,
  sendFriendRequest,
  sendNudge,
} from "@/lib/friends-dal";
import { savePushSubscription } from "@/lib/push-dal";
import { createTestUser, makeDraft } from "@/test/factories";
import { createId } from "@/utils/id";

const mocks = vi.hoisted(() => ({
  config: null as {
    publicKey: string;
    privateKey: string;
    subject: string;
  } | null,
}));

vi.mock("web-push", () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() },
}));
vi.mock("@/lib/push-config", () => ({
  get pushConfig() {
    return mocks.config;
  },
}));

const CONFIG = {
  publicKey: "public-key",
  privateKey: "private-key",
  subject: "mailto:test@example.test",
};
const DAY_MS = 24 * 60 * 60 * 1000;
const sendNotification = vi.mocked(webpush.sendNotification);

const uniqueName = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;

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

/** Saves a device for `userId` and returns its endpoint. */
async function addDevice(
  userId: string,
  expiresAt?: Date,
  suffix = "",
): Promise<string> {
  const endpoint = `https://push.example.test/${createId()}${suffix}`;
  const sessionId = await createTestSession(userId, expiresAt);
  await savePushSubscription(
    userId,
    sessionId,
    {
      endpoint,
      keys: { p256dh: `p256dh-${endpoint}`, auth: `auth-${endpoint}` },
    },
    null,
  );
  return endpoint;
}

const exists = async (endpoint: string) =>
  (await db.pushSubscription.count({ where: { endpoint } })) > 0;

let receiver: string;
let maria: string;
let pushCheers: typeof import("@/lib/push-sender").pushCheers;

beforeEach(async () => {
  vi.clearAllMocks();
  sendNotification.mockResolvedValue({
    statusCode: 201,
    body: "",
    headers: {},
  });
  mocks.config = CONFIG;
  ({ pushCheers } = await import("@/lib/push-sender"));
  receiver = await createTestUser({
    name: "Reader",
    username: uniqueName("reader"),
  });
  await setTimeZone(receiver, "UTC");
  maria = await createTestUser({
    name: "Maria",
    username: uniqueName("maria"),
  });
  await sendFriendRequest(maria, receiver);
  await acceptFriendRequest(receiver, maria);
  await sendNudge(maria, receiver, new Date());
});

describe("pushCheers", () => {
  it("sends the open senders' title to every live subscription", async () => {
    const first = await addDevice(receiver);
    const second = await addDevice(receiver);

    await pushCheers(receiver);

    expect(sendNotification).toHaveBeenCalledTimes(2);
    for (const endpoint of [first, second]) {
      expect(sendNotification).toHaveBeenCalledWith(
        {
          endpoint,
          keys: { p256dh: `p256dh-${endpoint}`, auth: `auth-${endpoint}` },
        },
        expect.any(String),
        { TTL: 86_400 },
      );
    }
    const payload = JSON.parse(String(sendNotification.mock.calls[0]?.[1]));
    expect(payload).toMatchObject({
      title: "Maria is cheering you on",
      tag: "cheers",
    });
  });

  it("does nothing when the receiver has no live subscriptions", async () => {
    await pushCheers(receiver);

    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("does nothing when push is not configured", async () => {
    await addDevice(receiver);
    mocks.config = null;

    await pushCheers(receiver);

    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("sets the VAPID details once, only when configured", async () => {
    const setVapidDetails = vi.mocked(webpush.setVapidDetails);

    vi.resetModules();
    mocks.config = null;
    await import("@/lib/push-sender");
    expect(setVapidDetails).not.toHaveBeenCalled();

    vi.resetModules();
    mocks.config = CONFIG;
    await import("@/lib/push-sender");
    expect(setVapidDetails).toHaveBeenCalledTimes(1);
    expect(setVapidDetails).toHaveBeenCalledWith(
      CONFIG.subject,
      CONFIG.publicKey,
      CONFIG.privateKey,
    );
  });

  it("does nothing when the receiver has no open nudges", async () => {
    await addDevice(receiver);
    const plan = await createReadingPlan(receiver, makeDraft());
    await markReadingComplete(receiver, {
      readingPlanId: plan.id,
      localDate: "2999-01-01",
      chapters: [{ bookId: "GEN", chapter: 1 }],
      completedAt: 1_000,
    });

    await pushCheers(receiver);

    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("skips a subscription whose session has expired", async () => {
    const live = await addDevice(receiver);
    await addDevice(receiver, new Date(Date.now() - 1000));

    await pushCheers(receiver);

    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(sendNotification.mock.calls[0]?.[0].endpoint).toBe(live);
  });

  it.each([
    410, 404,
  ])("deletes a subscription the push service reports gone (%i)", async (statusCode) => {
    const gone = await addDevice(receiver);
    const kept = await addDevice(receiver);
    sendNotification.mockImplementation(async (subscription) => {
      if (subscription.endpoint === gone) throw { statusCode };
      return { statusCode: 201, body: "", headers: {} };
    });

    await pushCheers(receiver);

    expect(await exists(gone)).toBe(false);
    expect(await exists(kept)).toBe(true);
  });

  it("keeps other subscriptions and resolves when one send fails with 500", async () => {
    const failing = await addDevice(receiver);
    const ok = await addDevice(receiver);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    sendNotification.mockImplementation(async (subscription) => {
      if (subscription.endpoint === failing) throw { statusCode: 500 };
      return { statusCode: 201, body: "", headers: {} };
    });

    await expect(pushCheers(receiver)).resolves.toBeUndefined();

    expect(await exists(failing)).toBe(true);
    expect(await exists(ok)).toBe(true);
    expect(error).toHaveBeenCalledWith("Push failed", 500);
    error.mockRestore();
  });
});
