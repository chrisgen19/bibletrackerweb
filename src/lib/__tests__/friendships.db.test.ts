// Friend requests and friendships (spec: 2026-10-31-friends-connections-design.md,
// "State rules" and "Limits"): the friends DAL's second half, against the real test
// database.
import { beforeEach, describe, expect, it } from "vitest";

import {
  MAX_FRIENDS,
  MAX_PENDING_OUTGOING,
} from "@/features/friends/domain/types";
import { db } from "@/lib/db";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineAllFriendRequests,
  declineFriendRequest,
  getFriendsOverview,
  getRelationship,
  removeFriend,
  sendFriendRequest,
} from "@/lib/friends-dal";
import { createTestUser } from "@/test/factories";
import { createId } from "@/utils/id";

/** A valid username, unique per call (the column is unique across tests). */
const uniqueName = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;

const involving = (userId: string) => ({
  OR: [{ userAId: userId }, { userBId: userId }],
});
const pairCount = (userId: string) =>
  db.friendship.count({ where: involving(userId) });

let alice: string;
let bob: string;
let carol: string;

beforeEach(async () => {
  alice = await createTestUser({
    name: "Alice",
    username: uniqueName("alice"),
  });
  bob = await createTestUser({ name: "bob", username: uniqueName("bob") });
  carol = await createTestUser({
    name: "Carol",
    username: uniqueName("carol"),
  });
});

describe("sending requests", () => {
  it("stores one ordered row whichever side asks", async () => {
    expect(await sendFriendRequest(alice, bob)).toBe("requested");
    const row = await db.friendship.findFirstOrThrow({
      where: { OR: [{ userAId: alice }, { userBId: alice }] },
    });
    expect(row.userAId < row.userBId).toBe(true);
    expect(row.requestedById).toBe(alice);
    expect(row.status).toBe("pending");
    expect(await getRelationship(alice, bob)).toBe("outgoing");
    expect(await getRelationship(bob, alice)).toBe("incoming");
  });

  it("turns a crossed request into a friendship", async () => {
    await sendFriendRequest(alice, bob);
    expect(await sendFriendRequest(bob, alice)).toBe("accepted");
    expect(await getRelationship(alice, bob)).toBe("friends");
    const row = await db.friendship.findFirstOrThrow({
      where: { OR: [{ userAId: alice }, { userBId: alice }] },
    });
    expect(row.acceptedAt).not.toBeNull();
  });

  it("resolves simultaneous crossed requests to one accepted friendship", async () => {
    const outcomes = await Promise.all([
      sendFriendRequest(alice, bob),
      sendFriendRequest(bob, alice),
    ]);
    expect(outcomes.sort()).toEqual(["accepted", "requested"]);
    expect(await pairCount(alice)).toBe(1);
    expect(await getRelationship(alice, bob)).toBe("friends");
  });

  it("reports a repeat request instead of failing", async () => {
    await sendFriendRequest(alice, bob);
    expect(await sendFriendRequest(alice, bob)).toBe("already-requested");
    await acceptFriendRequest(bob, alice);
    expect(await sendFriendRequest(alice, bob)).toBe("already-friends");
    expect(await sendFriendRequest(bob, alice)).toBe("already-friends");
    expect(await pairCount(alice)).toBe(1);
  });

  it("returns not-found for a deleted or unknown user", async () => {
    expect(await sendFriendRequest(alice, createId())).toBe("not-found");
    const gone = await createTestUser({ username: uniqueName("gone") });
    await db.user.delete({ where: { id: gone } });
    expect(await sendFriendRequest(alice, gone)).toBe("not-found");
    expect(await pairCount(alice)).toBe(0);
  });

  it("caps outgoing pending requests at 50", async () => {
    const targets = await Promise.all(
      Array.from({ length: MAX_PENDING_OUTGOING + 1 }, () => createTestUser()),
    );
    const overflow = targets.pop() ?? "";
    for (const target of targets) {
      expect(await sendFriendRequest(alice, target)).toBe("requested");
    }
    expect(await sendFriendRequest(alice, overflow)).toBe("too-many-pending");
    expect(await pairCount(alice)).toBe(MAX_PENDING_OUTGOING);
  });
});

describe("responding to requests", () => {
  it("only lets the receiver accept or decline", async () => {
    await sendFriendRequest(alice, bob);
    expect(await acceptFriendRequest(alice, bob)).toBe("not-found");
    expect(await declineFriendRequest(alice, bob)).toBe(false);
    expect(await acceptFriendRequest(bob, alice)).toBe("accepted");
    expect(await getRelationship(alice, bob)).toBe("friends");
  });

  it("only lets the requester cancel", async () => {
    await sendFriendRequest(alice, bob);
    expect(await cancelFriendRequest(bob, alice)).toBe(false);
    expect(await cancelFriendRequest(alice, bob)).toBe(true);
    expect(await getRelationship(alice, bob)).toBe("none");
    expect(await cancelFriendRequest(alice, bob)).toBe(false);
  });

  it("does not let a reader outside the pair change it", async () => {
    await sendFriendRequest(alice, bob);
    expect(await acceptFriendRequest(carol, bob)).toBe("not-found");
    expect(await acceptFriendRequest(carol, alice)).toBe("not-found");
    expect(await declineFriendRequest(carol, bob)).toBe(false);
    expect(await cancelFriendRequest(carol, bob)).toBe(false);
    expect(await removeFriend(carol, bob)).toBe(false);
    expect(await getRelationship(alice, bob)).toBe("outgoing");
    await acceptFriendRequest(bob, alice);
    expect(await removeFriend(carol, bob)).toBe(false);
    expect(await getRelationship(alice, bob)).toBe("friends");
  });

  it("removes an accepted friendship from either side", async () => {
    await sendFriendRequest(alice, bob);
    await acceptFriendRequest(bob, alice);
    expect(await removeFriend(bob, alice)).toBe(true);
    expect(await getRelationship(alice, bob)).toBe("none");
    await sendFriendRequest(alice, bob);
    await acceptFriendRequest(bob, alice);
    expect(await removeFriend(alice, bob)).toBe(true);
  });

  it("does not remove a pending request through removeFriend", async () => {
    await sendFriendRequest(alice, bob);
    expect(await removeFriend(alice, bob)).toBe(false);
    expect(await removeFriend(bob, alice)).toBe(false);
    expect(await getRelationship(alice, bob)).toBe("outgoing");
  });

  it("lets a declined requester ask again", async () => {
    await sendFriendRequest(alice, bob);
    expect(await declineFriendRequest(bob, alice)).toBe(true);
    expect(await getRelationship(alice, bob)).toBe("none");
    expect(await sendFriendRequest(alice, bob)).toBe("requested");
  });

  it("caps friends at 500 for both people on accept", async () => {
    await seedFriends(bob, MAX_FRIENDS);
    await sendFriendRequest(alice, bob);
    expect(await acceptFriendRequest(bob, alice)).toBe("friend-limit");
    expect(await getRelationship(alice, bob)).toBe("outgoing");

    // The requester being full blocks the accept too.
    await seedFriends(carol, MAX_FRIENDS);
    const dave = await createTestUser({ username: uniqueName("dave") });
    await sendFriendRequest(carol, dave);
    expect(await acceptFriendRequest(dave, carol)).toBe("friend-limit");

    // A crossed request counts as an accept.
    expect(await sendFriendRequest(dave, carol)).toBe("friend-limit");
    expect(await getRelationship(dave, carol)).toBe("incoming");
  });

  it("never fails when a cancel races an accept", async () => {
    for (let i = 0; i < 10; i++) {
      await sendFriendRequest(alice, bob);
      const results = await Promise.allSettled([
        cancelFriendRequest(alice, bob),
        acceptFriendRequest(bob, alice),
      ]);
      expect(results.every((r) => r.status === "fulfilled")).toBe(true);
      const rows = await db.friendship.findMany({ where: involving(alice) });
      expect(rows.length <= 1).toBe(true);
      if (rows[0]) expect(rows[0].status).toBe("accepted");
      await db.friendship.deleteMany({ where: involving(alice) });
    }
  });

  it("never fails when decline-all races a crossed send", async () => {
    for (let i = 0; i < 10; i++) {
      await sendFriendRequest(alice, bob);
      const results = await Promise.allSettled([
        declineAllFriendRequests(bob),
        sendFriendRequest(bob, alice),
      ]);
      expect(results.every((r) => r.status === "fulfilled")).toBe(true);
      expect((await pairCount(alice)) <= 1).toBe(true);
      await db.friendship.deleteMany({ where: involving(alice) });
    }
  });

  it("declines all incoming at once and leaves outgoing alone", async () => {
    const dave = await createTestUser({ username: uniqueName("dave") });
    await sendFriendRequest(bob, alice);
    await sendFriendRequest(carol, alice);
    await sendFriendRequest(alice, dave);
    await sendFriendRequest(dave, bob);
    expect(await declineAllFriendRequests(alice)).toBe(2);
    expect(await getRelationship(alice, bob)).toBe("none");
    expect(await getRelationship(alice, carol)).toBe("none");
    expect(await getRelationship(alice, dave)).toBe("outgoing");
    expect(await getRelationship(bob, dave)).toBe("incoming");
  });
});

describe("overview", () => {
  it("returns an overview without email, with outgoing as handles only", async () => {
    await sendFriendRequest(alice, bob);
    await sendFriendRequest(carol, alice);
    const overview = await getFriendsOverview(alice);
    expect(Object.keys(overview.outgoing[0] ?? {}).sort()).toEqual([
      "userId",
      "username",
    ]);
    expect(Object.keys(overview.incoming[0] ?? {}).sort()).toEqual([
      "image",
      "name",
      "userId",
      "username",
    ]);
    expect(overview.outgoing[0]?.userId).toBe(bob);
    expect(overview.incoming[0]?.userId).toBe(carol);
    expect(overview.friends).toEqual([]);
  });

  it("sorts friends by name ignoring case and requests newest first", async () => {
    const zed = await createTestUser({
      name: "Zed",
      username: uniqueName("zed"),
    });
    for (const other of [zed, bob, carol]) {
      await sendFriendRequest(other, alice);
      await acceptFriendRequest(alice, other);
    }
    const overview = await getFriendsOverview(alice);
    expect(overview.friends.map((f) => f.name)).toEqual([
      "bob",
      "Carol",
      "Zed",
    ]);
    expect(Object.keys(overview.friends[0] ?? {}).sort()).toEqual([
      "image",
      "name",
      "userId",
      "username",
    ]);

    const first = await createTestUser({ username: uniqueName("first") });
    const second = await createTestUser({ username: uniqueName("second") });
    await sendFriendRequest(first, alice);
    await sendFriendRequest(second, alice);
    const next = await getFriendsOverview(alice);
    expect(next.incoming.map((p) => p.userId)).toEqual([second, first]);
  });

  it("reports self for the same reader", async () => {
    expect(await getRelationship(alice, alice)).toBe("self");
  });
});

/** Gives `userId` `count` accepted friendships with fresh users, via raw inserts. */
async function seedFriends(userId: string, count: number): Promise<void> {
  const ids = Array.from({ length: count }, () => createId());
  await db.user.createMany({
    data: ids.map((id) => ({
      id,
      name: "Seed",
      email: `${id}@example.test`,
    })),
  });
  const now = new Date();
  await db.friendship.createMany({
    data: ids.map((id) => {
      const [userAId, userBId] = id < userId ? [id, userId] : [userId, id];
      return {
        userAId,
        userBId,
        requestedById: id,
        status: "accepted" as const,
        acceptedAt: now,
      };
    }),
  });
}
