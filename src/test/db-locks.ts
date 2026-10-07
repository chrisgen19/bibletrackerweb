import { expect, vi } from "vitest";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/**
 * Lock waits read from Postgres, for race tests that hold one transaction open and must
 * know another has reached the database before letting the first commit. A fixed sleep
 * only hopes so: on a slow machine the second could start after the commit and the test
 * would pass without racing anything. Both waits match one specific lock, because db test
 * files run in parallel.
 */

async function waitForWaiters(count: () => Promise<number>): Promise<void> {
  await vi.waitFor(async () => expect(await count()).toBe(1), {
    timeout: 5_000,
    interval: 20,
  });
}

/**
 * Resolves once a session is blocked on this reader's advisory lock (lockReader in
 * dal.ts). A bigint key shows in pg_locks as its high and low 32 bits (classid, objid),
 * objsubid 1.
 */
export async function waitForReaderLockWaiter(userId: string): Promise<void> {
  await waitForWaiters(async () => {
    const [row] = await db.$queryRaw<{ waiting: number }[]>`
      SELECT count(*)::int AS waiting FROM pg_locks
      WHERE locktype = 'advisory' AND NOT granted AND objsubid = 1
        AND classid::bigint = (hashtextextended(${userId}, 0) >> 32) & 4294967295
        AND objid::bigint = hashtextextended(${userId}, 0) & 4294967295`;
    return row?.waiting ?? 0;
  });
}

/** The id of the transaction `tx` runs in, for waitForTransactionWaiter. */
export async function transactionIdOf(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const [row] = await tx.$queryRaw<{ xid: string }[]>`
    SELECT xid(pg_current_xact_id())::text AS xid`;
  if (row === undefined) throw new Error("No transaction id");
  return row.xid;
}

/**
 * Resolves once a session is blocked behind the transaction `xid`: waiting for a row it
 * changed, as a foreign-key check on a row it deleted does.
 */
export async function waitForTransactionWaiter(xid: string): Promise<void> {
  await waitForWaiters(async () => {
    const [row] = await db.$queryRaw<{ waiting: number }[]>`
      SELECT count(*)::int AS waiting FROM pg_locks
      WHERE locktype = 'transactionid' AND NOT granted AND transactionid::text = ${xid}`;
    return row?.waiting ?? 0;
  });
}
