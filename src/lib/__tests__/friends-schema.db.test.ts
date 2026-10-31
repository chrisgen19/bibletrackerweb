// Friends schema (spec: 2026-10-31-friends-connections-design.md, "Data model"):
// the CHECK constraints, unique pair and cascades, exercised with raw `db` writes.
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
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
