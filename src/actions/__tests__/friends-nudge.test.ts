// nudgeFriend schedules a push with after() only when a cheer was actually sent.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUser, nudgeFriendFor, pushCheers, after } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  nudgeFriendFor: vi.fn(),
  pushCheers: vi.fn(),
  after: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireUser }));
vi.mock("@/features/friends/commands/commands", () => ({ nudgeFriendFor }));
vi.mock("@/lib/push-sender", () => ({ pushCheers }));
vi.mock("next/server", () => ({ after }));

import { nudgeFriend } from "../friends";

/** Callbacks handed to after(): captured, not run, so each test decides when they run. */
let scheduled: Array<() => Promise<void>>;

beforeEach(() => {
  vi.clearAllMocks();
  scheduled = [];
  requireUser.mockResolvedValue({ id: "user-1" });
  pushCheers.mockResolvedValue(undefined);
  after.mockImplementation((callback: () => Promise<void>) => {
    scheduled.push(callback);
  });
});

describe("nudgeFriend", () => {
  it("schedules a push only when the nudge was sent", async () => {
    nudgeFriendFor.mockResolvedValue({ ok: true });
    expect(await nudgeFriend({ userId: "friend-1" })).toEqual({ ok: true });
    expect(after).toHaveBeenCalledTimes(1);
    expect(pushCheers).not.toHaveBeenCalled();
    await scheduled[0]?.();
    expect(pushCheers).toHaveBeenCalledWith("friend-1");

    for (const error of ["already-nudged", "already-read", "not-found"]) {
      pushCheers.mockClear();
      after.mockClear();
      nudgeFriendFor.mockResolvedValue({ ok: false, error });
      expect(await nudgeFriend({ userId: "friend-1" })).toEqual({
        ok: false,
        error,
      });
      expect(after).not.toHaveBeenCalled();
      expect(pushCheers).not.toHaveBeenCalled();
    }
  });

  it("returns ok without waiting for the push, even when it throws", async () => {
    nudgeFriendFor.mockResolvedValue({ ok: true });
    pushCheers.mockRejectedValue(new Error("push service down"));

    // The result is back before the scheduled callback has run: the action never waits on it.
    expect(await nudgeFriend({ userId: "friend-1" })).toEqual({ ok: true });
    expect(after).toHaveBeenCalledTimes(1);
    expect(pushCheers).not.toHaveBeenCalled();

    // Only the scheduled callback sees the failure; nothing escapes unhandled.
    await expect(scheduled[0]?.()).rejects.toThrow("push service down");
    expect(pushCheers).toHaveBeenCalledWith("friend-1");
  });
});
