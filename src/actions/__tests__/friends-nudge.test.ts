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

beforeEach(() => {
  vi.clearAllMocks();
  requireUser.mockResolvedValue({ id: "user-1" });
  pushCheers.mockResolvedValue(undefined);
  // Run the callback immediately; swallow its rejection as the real after() would.
  after.mockImplementation((callback: () => Promise<void>) => {
    void Promise.resolve(callback()).catch(() => undefined);
  });
});

describe("nudgeFriend", () => {
  it("schedules a push only when the nudge was sent", async () => {
    nudgeFriendFor.mockResolvedValue({ ok: true });
    expect(await nudgeFriend({ userId: "friend-1" })).toEqual({ ok: true });
    expect(pushCheers).toHaveBeenCalledTimes(1);
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

  it("returns ok even when the push throws", async () => {
    nudgeFriendFor.mockResolvedValue({ ok: true });
    pushCheers.mockRejectedValue(new Error("push service down"));
    expect(await nudgeFriend({ userId: "friend-1" })).toEqual({ ok: true });
    expect(pushCheers).toHaveBeenCalledTimes(1);
  });
});
