// Friends schema (spec: 2026-10-31-friends-connections-design.md, "Data model"):
// the CHECK constraints, unique pair and cascades, exercised with raw `db` writes.
import { beforeEach, describe, expect, it } from "vitest";

import { isUniqueViolation } from "@/lib/dal";
import { db } from "@/lib/db";
import {
  acceptFriendRequest,
  removeFriend,
  sendFriendRequest,
} from "@/lib/friends-dal";
import { createTestUser } from "@/test/factories";

/** A valid 10-character code, unique per call (the code column is unique across tests). */
const randomCode = () => crypto.randomUUID().replace(/-/g, "").slice(0, 10);

let a: string;
let b: string;
let c: string;
let lo: string;
let hi: string;

beforeEach(async () => {
  a = await createTestUser();
  b = await createTestUser();
  c = await createTestUser();
  // Plain code-unit order, which is what the COLLATE "C" CHECK agrees with.
  [lo, hi] = a < b ? [a, b] : [b, a];
});

describe("friendship constraints", () => {
  it("rejects a friendship stored out of order or with yourself", async () => {
    await expect(
      db.friendship.create({
        data: { userAId: hi, userBId: lo, requestedById: hi },
      }),
    ).rejects.toThrow();
    await expect(
      db.friendship.create({
        data: { userAId: lo, userBId: lo, requestedById: lo },
      }),
    ).rejects.toThrow();
  });

  it("rejects a requester outside the pair", async () => {
    await expect(
      db.friendship.create({
        data: { userAId: lo, userBId: hi, requestedById: c },
      }),
    ).rejects.toThrow();
  });

  it("requires accepted_at exactly when accepted", async () => {
    await expect(
      db.friendship.create({
        data: {
          userAId: lo,
          userBId: hi,
          requestedById: lo,
          status: "accepted",
        },
      }),
    ).rejects.toThrow();
    await expect(
      db.friendship.create({
        data: {
          userAId: lo,
          userBId: hi,
          requestedById: lo,
          status: "pending",
          acceptedAt: new Date(),
        },
      }),
    ).rejects.toThrow();
    await expect(
      db.friendship.create({
        data: {
          userAId: lo,
          userBId: hi,
          requestedById: lo,
          status: "accepted",
          acceptedAt: new Date(),
        },
      }),
    ).resolves.toBeDefined();
  });

  it("allows one row per pair", async () => {
    await db.friendship.create({
      data: { userAId: lo, userBId: hi, requestedById: lo },
    });
    await expect(
      db.friendship.create({
        data: { userAId: lo, userBId: hi, requestedById: hi },
      }),
    ).rejects.toThrow();
  });
});

describe("username and invite code constraints", () => {
  it("rejects usernames outside ^[a-z0-9_]{3,20}$", async () => {
    for (const bad of ["Ab", "ab", "a-b-c", "a".repeat(21), "ABC"]) {
      await expect(
        db.user.update({ where: { id: a }, data: { username: bad } }),
      ).rejects.toThrow();
    }
    const ok = `ab_${a
      .slice(0, 8)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")}`;
    await expect(
      db.user.update({ where: { id: a }, data: { username: ok } }),
    ).resolves.toBeDefined();
  });

  it("rejects invite codes that are not 10 alphanumerics", async () => {
    for (const bad of ["short", "abcdefghi!", "abcdefghijk"]) {
      await expect(
        db.friendInvite.create({ data: { userId: a, code: bad } }),
      ).rejects.toThrow();
    }
    await expect(
      db.friendInvite.create({ data: { userId: a, code: randomCode() } }),
    ).resolves.toBeDefined();
  });
});

describe("cascades", () => {
  it("cascades both tables when a user is deleted", async () => {
    await db.friendInvite.create({ data: { userId: lo, code: randomCode() } });
    await db.friendship.create({
      data: { userAId: lo, userBId: hi, requestedById: hi },
    });
    await db.user.delete({ where: { id: lo } });
    expect(await db.friendInvite.count({ where: { userId: lo } })).toBe(0);
    expect(await db.friendship.count({ where: { userBId: hi } })).toBe(0);
  });
});

describe("friend_nudge", () => {
  const day = new Date("2026-11-01T00:00:00.000Z");
  const nextDay = new Date("2026-11-02T00:00:00.000Z");

  async function makeFriendship(): Promise<string> {
    await sendFriendRequest(a, b);
    await acceptFriendRequest(b, a);
    const row = await db.friendship.findFirstOrThrow({
      where: { userAId: lo, userBId: hi },
    });
    return row.id;
  }

  function nudge(friendshipId: string, localDate: Date) {
    return db.friendNudge.create({
      data: { friendshipId, senderId: a, receiverId: b, localDate },
    });
  }

  it("rejects a second nudge for the same sender, receiver and day", async () => {
    const friendshipId = await makeFriendship();
    await nudge(friendshipId, day);
    const error = await nudge(friendshipId, day).catch((e: unknown) => e);
    expect(isUniqueViolation(error)).toBe(true);
  });

  it("allows the same pair on another day", async () => {
    const friendshipId = await makeFriendship();
    await nudge(friendshipId, day);
    await expect(nudge(friendshipId, nextDay)).resolves.toBeDefined();
  });

  it("deletes nudges when the friendship is removed", async () => {
    const friendshipId = await makeFriendship();
    await nudge(friendshipId, day);
    await removeFriend(a, b);
    expect(await db.friendNudge.count({ where: { friendshipId } })).toBe(0);
  });

  it("deletes nudges when the sender is deleted", async () => {
    const friendshipId = await makeFriendship();
    await nudge(friendshipId, day);
    await db.user.delete({ where: { id: a } });
    expect(await db.friendNudge.count({ where: { friendshipId } })).toBe(0);
  });

  it("rejects a nudge to yourself", async () => {
    const friendshipId = await makeFriendship();
    await expect(
      db.friendNudge.create({
        data: { friendshipId, senderId: a, receiverId: a, localDate: day },
      }),
    ).rejects.toThrow();
  });
});
