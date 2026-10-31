import "server-only";

import {
  generateInviteCode,
  isInviteCode,
} from "@/features/friends/domain/invite-code";
import type {
  FriendProfile,
  PublicHandle,
} from "@/features/friends/domain/types";
import { isUniqueViolation } from "@/lib/dal";
import { db } from "@/lib/db";

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
