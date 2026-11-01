// Server Actions are public POST endpoints: each must check the session first.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUser, getCurrentSessionId, commands, getHeader, redirect } =
  vi.hoisted(() => ({
    requireUser: vi.fn(),
    getCurrentSessionId: vi.fn(),
    commands: {
      savePushSubscriptionFor: vi.fn(),
      refreshPushSubscriptionFor: vi.fn(),
      deletePushSubscriptionFor: vi.fn(),
    },
    getHeader: vi.fn(),
    redirect: vi.fn(),
  }));

vi.mock("@/lib/session", () => ({ requireUser, getCurrentSessionId }));
vi.mock("@/features/push/commands/commands", () => commands);
vi.mock("next/headers", () => ({
  headers: async () => ({ get: getHeader }),
}));
vi.mock("next/navigation", () => ({ redirect }));

import {
  deletePushSubscription,
  refreshPushSubscription,
  savePushSubscription,
} from "../push";

const USER = { id: "user-1", name: "R", email: "r@example.test", image: null };
const SUB = {
  endpoint: "https://fcm.googleapis.com/fcm/send/x",
  keys: { p256dh: "p", auth: "a" },
};

const cases = [
  [
    "savePushSubscription",
    savePushSubscription,
    SUB,
    "savePushSubscriptionFor",
  ],
  [
    "refreshPushSubscription",
    refreshPushSubscription,
    SUB,
    "refreshPushSubscriptionFor",
  ],
  [
    "deletePushSubscription",
    deletePushSubscription,
    { endpoint: SUB.endpoint },
    "deletePushSubscriptionFor",
  ],
] as const;

function call(action: unknown, input: unknown): Promise<unknown> {
  return (action as (input: unknown) => Promise<unknown>)(input);
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const command of Object.values(commands)) {
    command.mockResolvedValue({ ok: true });
  }
  requireUser.mockResolvedValue(USER);
  getCurrentSessionId.mockResolvedValue("session-1");
  getHeader.mockReturnValue("UA/1");
  redirect.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
});

describe("each push action checks the session first", () => {
  it.each(
    cases,
  )("%s stops at requireUser", async (_n, action, input, command) => {
    requireUser.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(call(action, input)).rejects.toThrow("NEXT_REDIRECT");
    expect(getCurrentSessionId).not.toHaveBeenCalled();
    expect(commands[command]).not.toHaveBeenCalled();
  });

  it.each(
    cases,
  )("%s redirects to sign-in without a session id", async (_n, action, input, command) => {
    getCurrentSessionId.mockResolvedValue(null);
    await expect(call(action, input)).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/sign-in");
    expect(commands[command]).not.toHaveBeenCalled();
  });
});

describe("hand-off to the commands", () => {
  it("passes the session id and user agent to save", async () => {
    await savePushSubscription(SUB);
    expect(commands.savePushSubscriptionFor).toHaveBeenCalledWith(
      "user-1",
      "session-1",
      SUB,
      "UA/1",
    );
    expect(getHeader).toHaveBeenCalledWith("user-agent");
  });

  it("truncates the user agent to 512 characters and passes null when absent", async () => {
    getHeader.mockReturnValue("u".repeat(600));
    await savePushSubscription(SUB);
    expect(commands.savePushSubscriptionFor.mock.calls[0]?.[3]).toHaveLength(
      512,
    );

    getHeader.mockReturnValue(null);
    await savePushSubscription(SUB);
    expect(commands.savePushSubscriptionFor.mock.calls[1]?.[3]).toBeNull();
  });

  it("passes the session id to refresh and the user id to delete", async () => {
    await refreshPushSubscription(SUB);
    expect(commands.refreshPushSubscriptionFor).toHaveBeenCalledWith(
      "session-1",
      SUB,
    );
    await deletePushSubscription({ endpoint: SUB.endpoint });
    expect(commands.deletePushSubscriptionFor).toHaveBeenCalledWith("user-1", {
      endpoint: SUB.endpoint,
    });
  });
});
