// Nudges: one per sender, per receiver, per receiver's day, only between accepted
// friends, open until the receiver reads or dismisses. Against the real test database.
import { beforeEach, describe, expect, it } from "vitest";
import { createReadingPlan, markReadingComplete, setTimeZone } from "@/lib/dal";
import { db } from "@/lib/db";
import { fromDbDate } from "@/lib/db-date";
import {
  acceptFriendRequest,
  dismissOpenNudges,
  getOpenNudges,
  removeFriend,
  sendFriendRequest,
  sendNudge,
} from "@/lib/friends-dal";
import { createTestUser, makeDraft } from "@/test/factories";

/** A valid username, unique per call (the column is unique across parallel test files). */
const uniqueName = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;

const NOW = new Date("2026-10-31T11:00:00Z");

let reader: string;
let readerPlan: string;
let maria: string;
let mariaName: string;
let ben: string;
let benName: string;

async function befriend(a: string, b: string) {
  await sendFriendRequest(a, b);
  await acceptFriendRequest(b, a);
}

/** Records one plan chapter for `userId` on `localDate`. */
async function readOn(userId: string, planId: string, localDate: string) {
  await markReadingComplete(userId, {
    readingPlanId: planId,
    localDate,
    chapters: [{ bookId: "GEN", chapter: 1 }],
    completedAt: 1_000,
  });
}

function nudgesTo(receiverId: string) {
  return db.friendNudge.findMany({ where: { receiverId } });
}

beforeEach(async () => {
  reader = await createTestUser({
    name: "Reader",
    username: uniqueName("reader"),
  });
  readerPlan = (await createReadingPlan(reader, makeDraft())).id;
  mariaName = uniqueName("maria");
  maria = await createTestUser({ name: "Maria", username: mariaName });
  benName = uniqueName("ben");
  ben = await createTestUser({ name: "Ben", username: benName });
  await setTimeZone(reader, "UTC");
});

describe("sendNudge", () => {
  it("sends to an accepted friend", async () => {
    await befriend(maria, reader);

    expect(await sendNudge(maria, reader, NOW)).toBe("sent");

    const rows = await nudgesTo(reader);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.senderId).toBe(maria);
    expect(fromDbDate(rows[0]?.localDate ?? new Date(0))).toBe("2026-10-31");
  });

  it("answers not-found for a stranger, both pending directions, a removed friend and yourself", async () => {
    const outgoing = await createTestUser({ username: uniqueName("out") });
    const incoming = await createTestUser({ username: uniqueName("in") });
    await sendFriendRequest(reader, outgoing);
    await sendFriendRequest(incoming, reader);
    await befriend(ben, reader);
    await removeFriend(ben, reader);

    expect(await sendNudge(maria, reader, NOW)).toBe("not-found");
    expect(await sendNudge(reader, outgoing, NOW)).toBe("not-found");
    expect(await sendNudge(reader, incoming, NOW)).toBe("not-found");
    expect(await sendNudge(ben, reader, NOW)).toBe("not-found");
    expect(await sendNudge(reader, reader, NOW)).toBe("not-found");

    const rows = await db.friendNudge.findMany({
      where: {
        OR: [
          { senderId: { in: [reader, maria, ben] } },
          { receiverId: { in: [reader, outgoing, incoming] } },
        ],
      },
    });
    expect(rows).toHaveLength(0);
  });

  it("refuses a second nudge the same receiver day", async () => {
    await befriend(maria, reader);

    expect(await sendNudge(maria, reader, NOW)).toBe("sent");
    expect(
      await sendNudge(maria, reader, new Date("2026-10-31T20:00:00Z")),
    ).toBe("already-nudged");
  });

  it("stores one nudge from two concurrent sends", async () => {
    await befriend(maria, reader);

    const outcomes = await Promise.all([
      sendNudge(maria, reader, NOW),
      sendNudge(maria, reader, NOW),
    ]);

    expect([...outcomes].sort()).toEqual(["already-nudged", "sent"]);
    expect(await nudgesTo(reader)).toHaveLength(1);
  });

  it("refuses when the friend read today", async () => {
    await befriend(maria, reader);
    await readOn(reader, readerPlan, "2026-10-31");
    expect(await sendNudge(maria, reader, NOW)).toBe("already-read");

    const other = await createTestUser({ username: uniqueName("extra") });
    const otherPlan = (await createReadingPlan(other, makeDraft())).id;
    await befriend(maria, other);
    await markReadingComplete(other, {
      readingPlanId: otherPlan,
      localDate: "2026-10-31",
      chapters: [{ bookId: "PSA", chapter: 23 }],
      completedAt: 1_000,
      isExtra: true,
    });
    expect(await sendNudge(maria, other, NOW)).toBe("already-read");

    expect(await nudgesTo(reader)).toHaveLength(0);
    expect(await nudgesTo(other)).toHaveLength(0);
  });

  it("follows the receiver's midnight, not the sender's", async () => {
    await befriend(maria, reader);
    await setTimeZone(reader, "Pacific/Kiritimati");
    await setTimeZone(maria, "Pacific/Pago_Pago");

    expect(
      await sendNudge(maria, reader, new Date("2026-10-31T09:00:00Z")),
    ).toBe("sent");
    expect(
      await sendNudge(maria, reader, new Date("2026-10-31T10:30:00Z")),
    ).toBe("sent");

    const rows = await db.friendNudge.findMany({
      where: { receiverId: reader },
      orderBy: { localDate: "asc" },
    });
    expect(rows.map((row) => fromDbDate(row.localDate))).toEqual([
      "2026-10-31",
      "2026-11-01",
    ]);
  });

  it("a re-friended pair can nudge again the same day", async () => {
    await befriend(maria, reader);
    expect(await sendNudge(maria, reader, NOW)).toBe("sent");

    await removeFriend(reader, maria);
    await befriend(reader, maria);

    expect(await sendNudge(maria, reader, NOW)).toBe("sent");
  });
});

describe("getOpenNudges", () => {
  const mariaProfile = () => ({
    userId: maria,
    username: mariaName,
    name: "Maria",
    image: null,
  });
  const benProfile = () => ({
    userId: ben,
    username: benName,
    name: "Ben",
    image: null,
  });

  it("returns yesterday's nudge when nothing was read since", async () => {
    await befriend(maria, reader);
    await readOn(reader, readerPlan, "2026-10-29");
    await sendNudge(maria, reader, new Date("2026-10-30T11:00:00Z"));

    expect(await getOpenNudges(reader)).toEqual({ senders: [mariaProfile()] });
  });

  it("closes a nudge once the receiver reads on or after its day", async () => {
    await befriend(maria, reader);
    await sendNudge(maria, reader, NOW);

    await readOn(reader, readerPlan, "2026-10-30");
    expect(await getOpenNudges(reader)).toEqual({ senders: [mariaProfile()] });

    await readOn(reader, readerPlan, "2026-10-31");
    expect(await getOpenNudges(reader)).toEqual({ senders: [] });
  });

  it("treats a reader with no completions as unread", async () => {
    await befriend(maria, reader);
    await sendNudge(maria, reader, NOW);

    expect(await getOpenNudges(reader)).toEqual({ senders: [mariaProfile()] });
  });

  it("omits dismissed nudges", async () => {
    await befriend(maria, reader);
    await sendNudge(maria, reader, NOW);

    await dismissOpenNudges(reader, [maria], NOW);

    expect(await getOpenNudges(reader)).toEqual({ senders: [] });
  });

  it("lists each sender once, most recent first", async () => {
    await befriend(maria, reader);
    await befriend(ben, reader);
    await sendNudge(ben, reader, new Date("2026-10-30T11:00:00Z"));
    await sendNudge(maria, reader, new Date("2026-10-31T11:00:00Z"));
    await sendNudge(ben, reader, new Date("2026-11-01T11:00:00Z"));

    expect(await getOpenNudges(reader)).toEqual({
      senders: [benProfile(), mariaProfile()],
    });
  });

  it("drops nudges from a removed friend", async () => {
    await befriend(maria, reader);
    await befriend(ben, reader);
    await sendNudge(maria, reader, NOW);
    await sendNudge(ben, reader, NOW);

    await removeFriend(reader, maria);

    expect(await getOpenNudges(reader)).toEqual({ senders: [benProfile()] });
  });

  it("never includes email", async () => {
    await befriend(maria, reader);
    await sendNudge(maria, reader, NOW);

    const result = await getOpenNudges(reader);

    expect(result.senders).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain("@example.test");
  });
});

describe("dismissOpenNudges", () => {
  it("dismisses only the given senders", async () => {
    await befriend(maria, reader);
    await befriend(ben, reader);
    await sendNudge(maria, reader, NOW);
    await sendNudge(ben, reader, NOW);

    expect(await dismissOpenNudges(reader, [maria], NOW)).toBe(1);

    const open = await getOpenNudges(reader);
    expect(open.senders.map((sender) => sender.userId)).toEqual([ben]);
    const dismissed = await db.friendNudge.findFirst({
      where: { senderId: maria, receiverId: reader },
    });
    expect(dismissed?.dismissedAt).toEqual(NOW);
  });

  it("never touches nudges the reader sent", async () => {
    await befriend(maria, reader);
    await sendNudge(reader, maria, NOW);

    expect(await dismissOpenNudges(reader, [maria], NOW)).toBe(0);

    const sent = await db.friendNudge.findFirst({
      where: { senderId: reader, receiverId: maria },
    });
    expect(sent?.dismissedAt).toBeNull();
  });
});
