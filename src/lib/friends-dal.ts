import "server-only";

import {
  generateInviteCode,
  isInviteCode,
} from "@/features/friends/domain/invite-code";
import {
  type FriendListEntry,
  type FriendProfile,
  type FriendReadingLookup,
  type FriendsOverview,
  MAX_FRIENDS,
  MAX_PENDING_OUTGOING,
  type PublicHandle,
  type ReadTodayStatus,
  type Relationship,
} from "@/features/friends/domain/types";
import {
  normalizeUsername,
  usernameSchema,
} from "@/features/friends/domain/username";
import type { Prisma } from "@/generated/prisma/client";
import {
  getReadingSnapshot,
  getTimeZone,
  isForeignKeyViolation,
  isUniqueViolation,
  SETTING_KEYS,
} from "@/lib/dal";
import { db } from "@/lib/db";
import { fromDbDate, toDbDate } from "@/lib/db-date";
import { getTodayDateKeyInZone, isValidTimeZone } from "@/utils/zoned-date-key";

/**
 * The friends half of the data access layer: same rules as `dal.ts`. Only this module
 * and `dal.ts` query the database, and callers get domain types, never Prisma rows.
 */

/** Attempts at writing an invite code before a persistent collision is rethrown. */
const INVITE_CODE_ATTEMPTS = 3;

export async function getUsername(userId: string): Promise<string | null> {
  const row = await db.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  return row?.username ?? null;
}

/**
 * Stores a username the caller has already normalised and validated. Returns "taken"
 * when another reader holds it.
 */
export async function setUsername(
  userId: string,
  username: string,
): Promise<"ok" | "taken"> {
  try {
    await db.user.update({ where: { id: userId }, data: { username } });
    return "ok";
  } catch (error) {
    if (isUniqueViolation(error)) return "taken";
    throw error;
  }
}

/** Exact match only; selects just the id and username, never anything private. */
export async function findUserByUsername(
  username: string,
): Promise<PublicHandle | null> {
  const row = await db.user.findUnique({
    where: { username },
    select: { id: true, username: true },
  });
  if (row === null || row.username === null) return null;
  return { userId: row.id, username: row.username };
}

/**
 * The reader's invite code, created on first use. A unique violation means either
 * another device created the row first (re-read it) or the code collided (retry with
 * a fresh code), so on any violation re-read by user and only then retry.
 */
export async function getOrCreateInvite(userId: string): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    const existing = await db.friendInvite.findUnique({ where: { userId } });
    if (existing !== null) return existing.code;
    try {
      const created = await db.friendInvite.create({
        data: { userId, code: generateInviteCode() },
      });
      return created.code;
    } catch (error) {
      if (!isUniqueViolation(error) || attempt >= INVITE_CODE_ATTEMPTS) {
        throw error;
      }
    }
  }
}

/** Replaces the reader's code in place (new code and `createdAt`); the old link dies. */
export async function resetInvite(userId: string): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      const row = await db.friendInvite.upsert({
        where: { userId },
        create: { userId, code: generateInviteCode() },
        update: { code: generateInviteCode(), createdAt: new Date() },
      });
      return row.code;
    } catch (error) {
      if (!isUniqueViolation(error) || attempt >= INVITE_CODE_ATTEMPTS) {
        throw error;
      }
    }
  }
}

/**
 * Who an invite code belongs to, or null for a malformed, unknown or reset code, or an
 * owner who has not picked a username yet. Exposes name, photo and username only.
 */
export async function findInviteOwner(
  code: string,
): Promise<FriendProfile | null> {
  if (!isInviteCode(code)) return null;
  const invite = await db.friendInvite.findUnique({
    where: { code },
    select: {
      user: {
        select: { id: true, username: true, name: true, image: true },
      },
    },
  });
  const owner = invite?.user;
  if (owner === undefined || owner.username === null) return null;
  return {
    userId: owner.id,
    username: owner.username,
    name: owner.name,
    image: owner.image,
  };
}

export type SendOutcome =
  | "requested"
  | "accepted"
  | "already-requested"
  | "already-friends"
  | "too-many-pending"
  | "friend-limit"
  | "not-found";

/** Rows are stored with the smaller id first (the table's CHECK); plain `<` matches it. */
function orderPair(a: string, b: string): { userAId: string; userBId: string } {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

const involving = (userId: string): Prisma.FriendshipWhereInput => ({
  OR: [{ userAId: userId }, { userBId: userId }],
});

/**
 * Serialises changes to one pair, inside a transaction. Locks both readers (sorted, so
 * two opposite requests never deadlock) under a `friends:` key that cannot collide with
 * `lockReader`'s in `dal.ts`. Locking each reader, not the pair, also serialises one
 * reader's pending and friend counts across different partners.
 */
async function withPairLocked<T>(
  userId: string,
  otherUserId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const [first, second] =
    userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];
  return db.$transaction(async (tx) => {
    await lockFriendsOf(tx, first);
    await lockFriendsOf(tx, second);
    return work(tx);
  });
}

async function lockFriendsOf(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`friends:${userId}`}, 0))`;
}

async function countFriends(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<number> {
  return tx.friendship.count({
    where: { status: "accepted", ...involving(userId) },
  });
}

async function eitherAtFriendLimit(
  tx: Prisma.TransactionClient,
  userId: string,
  otherUserId: string,
): Promise<boolean> {
  const [mine, theirs] = await Promise.all([
    countFriends(tx, userId),
    countFriends(tx, otherUserId),
  ]);
  return mine >= MAX_FRIENDS || theirs >= MAX_FRIENDS;
}

/**
 * Accepts a pending row only if it is still pending and still from `requesterId`. The
 * locks already prevent a concurrent change; the guard means a surprise shows up as a
 * zero count ("not-found") rather than a thrown P2025.
 */
function markAccepted(
  tx: Prisma.TransactionClient,
  id: string,
  requesterId: string,
) {
  return tx.friendship.updateMany({
    where: { id, status: "pending", requestedById: requesterId },
    data: { status: "accepted", acceptedAt: new Date() },
  });
}

/**
 * Asks `otherUserId` to be friends, following the spec's state table: a request the
 * other side already made becomes a friendship, a repeat reports the current state.
 * Callers never pass the same id twice. A missing other user comes back as "not-found".
 */
export async function sendFriendRequest(
  userId: string,
  otherUserId: string,
): Promise<SendOutcome> {
  const pair = orderPair(userId, otherUserId);
  try {
    return await withPairLocked(userId, otherUserId, async (tx) => {
      const row = await tx.friendship.findUnique({
        where: { userAId_userBId: pair },
      });
      if (row !== null) {
        if (row.status === "accepted") return "already-friends";
        if (row.requestedById === userId) return "already-requested";
        if (await eitherAtFriendLimit(tx, userId, otherUserId)) {
          return "friend-limit";
        }
        const { count } = await markAccepted(tx, row.id, otherUserId);
        return count > 0 ? "accepted" : "not-found";
      }
      const pending = await tx.friendship.count({
        where: { requestedById: userId, status: "pending" },
      });
      if (pending >= MAX_PENDING_OUTGOING) return "too-many-pending";
      await tx.friendship.create({ data: { ...pair, requestedById: userId } });
      return "requested";
    });
  } catch (error) {
    if (isForeignKeyViolation(error)) return "not-found";
    throw error;
  }
}

/** The receiver accepts a pending request; anyone else, or no request, is "not-found". */
export async function acceptFriendRequest(
  userId: string,
  otherUserId: string,
): Promise<"accepted" | "not-found" | "friend-limit"> {
  const pair = orderPair(userId, otherUserId);
  return withPairLocked(userId, otherUserId, async (tx) => {
    const row = await tx.friendship.findFirst({
      where: { ...pair, requestedById: otherUserId, status: "pending" },
    });
    if (row === null) return "not-found";
    if (await eitherAtFriendLimit(tx, userId, otherUserId)) {
      return "friend-limit";
    }
    const { count } = await markAccepted(tx, row.id, otherUserId);
    return count > 0 ? "accepted" : "not-found";
  });
}

/** Deletes the row only when it matches the given role checks, under the pair locks; true when it did. */
async function deleteMatching(
  userId: string,
  otherUserId: string,
  where: Prisma.FriendshipWhereInput,
): Promise<boolean> {
  return withPairLocked(userId, otherUserId, async (tx) => {
    const { count } = await tx.friendship.deleteMany({
      where: { ...orderPair(userId, otherUserId), ...where },
    });
    return count > 0;
  });
}

/** The receiver turns down a pending request; the row is deleted. */
export function declineFriendRequest(
  userId: string,
  otherUserId: string,
): Promise<boolean> {
  return deleteMatching(userId, otherUserId, {
    requestedById: otherUserId,
    status: "pending",
  });
}

/** The requester withdraws their own pending request. */
export function cancelFriendRequest(
  userId: string,
  otherUserId: string,
): Promise<boolean> {
  return deleteMatching(userId, otherUserId, {
    requestedById: userId,
    status: "pending",
  });
}

/** Either friend ends an accepted friendship; pending requests are not touched. */
export function removeFriend(
  userId: string,
  otherUserId: string,
): Promise<boolean> {
  return deleteMatching(userId, otherUserId, { status: "accepted" });
}

/** Declines every pending request sent to the reader; returns how many. */
export async function declineAllFriendRequests(
  userId: string,
): Promise<number> {
  // Every send or accept involving this reader takes their lock, so this serialises.
  return db.$transaction(async (tx) => {
    await lockFriendsOf(tx, userId);
    const { count } = await tx.friendship.deleteMany({
      where: {
        ...involving(userId),
        status: "pending",
        requestedById: { not: userId },
      },
    });
    return count;
  });
}

export async function getRelationship(
  userId: string,
  otherUserId: string,
): Promise<Relationship> {
  if (userId === otherUserId) return "self";
  const row = await db.friendship.findUnique({
    where: { userAId_userBId: orderPair(userId, otherUserId) },
    select: { status: true, requestedById: true },
  });
  if (row === null) return "none";
  if (row.status === "accepted") return "friends";
  return row.requestedById === userId ? "outgoing" : "incoming";
}

/**
 * Whether each of `friendIds` has a reading logged on their own today. Three queries
 * however many friends there are (the list is capped at 500): their stored time zones,
 * their open plans, and the completions that fall on any of their todays. Each row is
 * then matched to its friend's own today in memory, so a friend in Kiritimati and one in
 * Pago Pago are judged on different days from the same completions query.
 *
 * A friend with no open plan is "no-plan" whatever they have logged. Any completion
 * counts, extras included, the same as the streak does.
 */
async function readTodayStatuses(
  friendIds: readonly string[],
  now: Date,
): Promise<Map<string, ReadTodayStatus>> {
  const statuses = new Map<string, ReadTodayStatus>();
  if (friendIds.length === 0) return statuses;

  const [zoneRows, openPlans] = await Promise.all([
    db.appSetting.findMany({
      where: { userId: { in: [...friendIds] }, key: SETTING_KEYS.timeZone },
      select: { userId: true, value: true },
    }),
    db.readingPlan.findMany({
      where: { userId: { in: [...friendIds] }, isActive: true, endDate: null },
      select: { userId: true },
    }),
  ]);

  const zones = new Map(zoneRows.map((row) => [row.userId, row.value]));
  const todays = new Map<string, string>();
  for (const id of friendIds) {
    const zone = zones.get(id);
    todays.set(
      id,
      getTodayDateKeyInZone(
        zone !== undefined && isValidTimeZone(zone) ? zone : "UTC",
        now,
      ),
    );
  }

  const withPlan = new Set(openPlans.map((plan) => plan.userId));
  const completions = await db.readingCompletion.findMany({
    where: {
      userId: { in: [...friendIds] },
      localDate: { in: [...new Set(todays.values())].map(toDbDate) },
    },
    select: { userId: true, localDate: true },
  });
  const readToday = new Set(
    completions
      .filter((row) => fromDbDate(row.localDate) === todays.get(row.userId))
      .map((row) => row.userId),
  );

  for (const id of friendIds) {
    statuses.set(
      id,
      !withPlan.has(id) ? "no-plan" : readToday.has(id) ? "read" : "not-yet",
    );
  }
  return statuses;
}

/**
 * Friends, incoming and outgoing requests for the Friends screen. Selects name, photo
 * and username of the other person, never email; outgoing carries the handle only. Each
 * friend also carries whether they have read today in their own time zone (`now` is
 * injectable for tests).
 */
export async function getFriendsOverview(
  userId: string,
  now: Date = new Date(),
): Promise<FriendsOverview> {
  const otherSelect = {
    select: { id: true, username: true, name: true, image: true },
  } as const;
  const rows = await db.friendship.findMany({
    where: involving(userId),
    orderBy: { createdAt: "desc" },
    select: {
      userAId: true,
      requestedById: true,
      status: true,
      userA: otherSelect,
      userB: otherSelect,
    },
  });

  const friendProfiles: FriendProfile[] = [];
  const incoming: FriendProfile[] = [];
  const outgoing: PublicHandle[] = [];
  for (const row of rows) {
    const other = row.userAId === userId ? row.userB : row.userA;
    if (other.username === null) continue;
    const profile: FriendProfile = {
      userId: other.id,
      username: other.username,
      name: other.name,
      image: other.image,
    };
    if (row.status === "accepted") friendProfiles.push(profile);
    else if (row.requestedById === userId) {
      outgoing.push({ userId: other.id, username: other.username });
    } else incoming.push(profile);
  }
  friendProfiles.sort(
    (a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) ||
      a.username.localeCompare(b.username),
  );
  const statuses = await readTodayStatuses(
    friendProfiles.map((friend) => friend.userId),
    now,
  );
  const friends: FriendListEntry[] = friendProfiles.map((friend) => ({
    ...friend,
    readToday: statuses.get(friend.userId) ?? "no-plan",
  }));
  return { friends, incoming, outgoing };
}

/**
 * An accepted friend's profile and reading data, looked up by username. The friendship
 * check sits right next to the read, so a friend's readings only ever reach an accepted
 * friend. Anything short of that (malformed or unknown username, no relationship, a
 * pending request either way, a removed friend) is the same "not-found". Selects name,
 * photo and username, never email.
 *
 * "Today" uses the friend's stored time zone (UTC until they have reported one), so the
 * viewer sees the day the friend is living, not the viewer's.
 */
export async function getFriendReading(
  viewerId: string,
  rawUsername: string,
  now: Date = new Date(),
): Promise<FriendReadingLookup> {
  const parsed = usernameSchema.safeParse(normalizeUsername(rawUsername));
  if (!parsed.success) return { kind: "not-found" };

  const row = await db.user.findUnique({
    where: { username: parsed.data },
    select: { id: true, username: true, name: true, image: true },
  });
  if (row === null || row.username === null) return { kind: "not-found" };
  if (row.id === viewerId) return { kind: "self" };
  if ((await getRelationship(viewerId, row.id)) !== "friends") {
    return { kind: "not-found" };
  }

  const [snapshot, timeZone] = await Promise.all([
    getReadingSnapshot(row.id),
    getTimeZone(row.id),
  ]);
  return {
    kind: "friend",
    profile: {
      userId: row.id,
      username: row.username,
      name: row.name,
      image: row.image,
    },
    reading: {
      snapshot,
      today: getTodayDateKeyInZone(timeZone ?? "UTC", now),
    },
  };
}
