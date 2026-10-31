// getFriendsOverview: whether each friend has read today, in the friend's own time zone.
// Against the real test database.
import { beforeEach, describe, expect, it } from "vitest";
import {
  createReadingPlan,
  markReadingComplete,
  resetAllProgress,
  setTimeZone,
} from "@/lib/dal";
import {
  acceptFriendRequest,
  getFriendsOverview,
  sendFriendRequest,
} from "@/lib/friends-dal";
import { createTestUser, makeDraft } from "@/test/factories";

/** A valid username, unique per call (the column is unique across parallel test files). */
const uniqueName = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;

const NOW = new Date("2026-10-31T11:00:00Z");

let viewer: string;

/** A friend of the viewer with an open plan; `readOn` logs a chapter on that day. */
async function makeFriend(
  name: string,
  options: { readOn?: string; isExtra?: boolean; timeZone?: string } = {},
): Promise<string> {
  const id = await createTestUser({ name, username: uniqueName("friend") });
  const plan = await createReadingPlan(id, makeDraft());
  if (options.timeZone !== undefined) await setTimeZone(id, options.timeZone);
  if (options.readOn !== undefined) {
    await markReadingComplete(id, {
      readingPlanId: plan.id,
      localDate: options.readOn,
      chapters: [{ bookId: "GEN", chapter: 1 }],
      completedAt: 1_000,
      isExtra: options.isExtra ?? false,
    });
  }
  await sendFriendRequest(viewer, id);
  await acceptFriendRequest(id, viewer);
  return id;
}

async function readToday(friendId: string) {
  const { friends } = await getFriendsOverview(viewer, NOW);
  return friends.find((entry) => entry.userId === friendId)?.readToday;
}

beforeEach(async () => {
  viewer = await createTestUser({ username: uniqueName("viewer") });
});

describe("getFriendsOverview readToday", () => {
  it("marks a friend who read on their own today as read", async () => {
    const friend = await makeFriend("Ana", { readOn: "2026-10-31" });
    expect(await readToday(friend)).toBe("read");
  });

  it("marks a friend who has not read today as not-yet", async () => {
    const friend = await makeFriend("Ana", { readOn: "2026-10-30" });
    expect(await readToday(friend)).toBe("not-yet");
  });

  it("counts an extra reading as read", async () => {
    const friend = await makeFriend("Ana", {
      readOn: "2026-10-31",
      isExtra: true,
    });
    expect(await readToday(friend)).toBe("read");
  });

  it("uses each friend's time zone", async () => {
    // At 11:00Z it is 2026-11-01 in Kiritimati (UTC+14), 2026-10-31 in UTC and 2026-10-31
    // (just after midnight) in Pago Pago (UTC-11).
    const ahead = await makeFriend("Ahead", {
      readOn: "2026-10-31",
      timeZone: "Pacific/Kiritimati",
    });
    const behind = await makeFriend("Behind", {
      readOn: "2026-10-31",
      timeZone: "Pacific/Pago_Pago",
    });
    const behindYesterday = await makeFriend("Behind yesterday", {
      readOn: "2026-10-30",
      timeZone: "Pacific/Pago_Pago",
    });

    expect(await readToday(ahead)).toBe("not-yet");
    expect(await readToday(behind)).toBe("read");
    expect(await readToday(behindYesterday)).toBe("not-yet");
  });

  it("marks a friend with no active plan as no-plan", async () => {
    const friend = await makeFriend("Ana", { readOn: "2026-10-31" });
    await resetAllProgress(friend);
    expect(await readToday(friend)).toBe("no-plan");
  });

  it("keeps friends sorted by name whatever their status", async () => {
    const carol = await makeFriend("Carol", { readOn: "2026-10-31" });
    const alice = await makeFriend("alice");
    const bob = await makeFriend("Bob");
    await resetAllProgress(bob);

    const { friends } = await getFriendsOverview(viewer, NOW);

    expect(friends.map((entry) => [entry.userId, entry.readToday])).toEqual([
      [alice, "not-yet"],
      [bob, "no-plan"],
      [carol, "read"],
    ]);
  });

  it("returns no friends without error when there are none", async () => {
    expect((await getFriendsOverview(viewer, NOW)).friends).toEqual([]);
  });
});
