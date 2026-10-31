// getFriendReading: the friendship check sits next to the read, so a friend's readings
// only ever reach an accepted friend. Against the real test database.
import { beforeEach, describe, expect, it } from "vitest";
import { createReadingPlan, markReadingComplete, setTimeZone } from "@/lib/dal";
import {
  acceptFriendRequest,
  getFriendReading,
  removeFriend,
  sendFriendRequest,
} from "@/lib/friends-dal";
import { createTestUser, makeDraft } from "@/test/factories";

/** A valid username, unique per call (the column is unique across parallel test files). */
const uniqueName = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;

const NOW = new Date("2026-10-31T11:00:00Z");

let viewer: string;
let friend: string;
let friendName: string;
let planId: string;

async function befriend(a: string, b: string) {
  await sendFriendRequest(a, b);
  await acceptFriendRequest(b, a);
}

beforeEach(async () => {
  viewer = await createTestUser({ username: uniqueName("viewer") });
  friendName = uniqueName("maria");
  friend = await createTestUser({ name: "Maria", username: friendName });
  const plan = await createReadingPlan(friend, makeDraft());
  planId = plan.id;
  await markReadingComplete(friend, {
    readingPlanId: plan.id,
    localDate: "2026-08-01",
    chapters: [{ bookId: "GEN", chapter: 1 }],
    completedAt: 1_000,
  });
});

describe("getFriendReading", () => {
  it("returns the profile, snapshot and today for an accepted friend", async () => {
    await befriend(viewer, friend);

    const result = await getFriendReading(viewer, friendName, NOW);

    expect(result.kind).toBe("friend");
    if (result.kind !== "friend") return;
    expect(result.profile).toEqual({
      userId: friend,
      username: friendName,
      name: "Maria",
      image: null,
    });
    expect(result.reading.snapshot.plans.map((plan) => plan.id)).toEqual([
      planId,
    ]);
    expect(result.reading.snapshot.completions).toEqual([
      expect.objectContaining({ bookId: "GEN", chapter: 1 }),
    ]);
    expect(result.reading.today).toBe("2026-10-31");
  });

  it("returns not-found for pending requests in either direction", async () => {
    await sendFriendRequest(viewer, friend);
    expect(await getFriendReading(viewer, friendName, NOW)).toEqual({
      kind: "not-found",
    });

    const viewerName = uniqueName("viewer");
    const other = await createTestUser({ username: viewerName });
    await sendFriendRequest(friend, other);
    expect(await getFriendReading(other, friendName, NOW)).toEqual({
      kind: "not-found",
    });
  });

  it("returns not-found with no relationship, after removal, and for an unknown username", async () => {
    expect(await getFriendReading(viewer, friendName, NOW)).toEqual({
      kind: "not-found",
    });

    await befriend(viewer, friend);
    await removeFriend(viewer, friend);
    expect(await getFriendReading(viewer, friendName, NOW)).toEqual({
      kind: "not-found",
    });

    expect(await getFriendReading(viewer, uniqueName("nobody"), NOW)).toEqual({
      kind: "not-found",
    });
  });

  it("returns not-found for a malformed username", async () => {
    await befriend(viewer, friend);
    for (const raw of ["ab", "has space", "x".repeat(21)]) {
      expect(await getFriendReading(viewer, raw, NOW)).toEqual({
        kind: "not-found",
      });
    }
  });

  it("returns self for the viewer's own username", async () => {
    const ownName = uniqueName("self");
    const own = await createTestUser({ username: ownName });
    expect(await getFriendReading(own, ownName, NOW)).toEqual({
      kind: "self",
    });
  });

  it("normalises the username before looking it up", async () => {
    await befriend(viewer, friend);
    const result = await getFriendReading(
      viewer,
      ` @${friendName.toUpperCase()} `,
      NOW,
    );
    expect(result.kind).toBe("friend");
  });

  it("computes today in the friend's stored time zone", async () => {
    await befriend(viewer, friend);
    await setTimeZone(friend, "Pacific/Kiritimati");

    const result = await getFriendReading(viewer, friendName, NOW);

    expect(result.kind === "friend" && result.reading.today).toBe("2026-11-01");
  });

  it("falls back to UTC when the friend has no time zone", async () => {
    await befriend(viewer, friend);

    const result = await getFriendReading(viewer, friendName, NOW);

    expect(result.kind === "friend" && result.reading.today).toBe("2026-10-31");
  });

  it("never includes an email", async () => {
    await befriend(viewer, friend);

    const result = await getFriendReading(viewer, friendName, NOW);

    expect(result.kind).toBe("friend");
    expect(JSON.stringify(result)).not.toContain("@example.test");
  });
});
