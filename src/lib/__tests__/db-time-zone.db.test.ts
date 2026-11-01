// Prisma's pg adapter sends a date as UTC wall-clock time with no offset, so Postgres reads
// it in the session's time zone. Only a server whose zone is not UTC can fail this test.
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { createTestUser } from "@/test/factories";

describe("stored timestamps", () => {
  it("keeps the instant it was given, whatever zone the server runs in", async () => {
    const instant = new Date("2026-11-01T11:09:14.730Z");
    const id = await createTestUser();

    await db.user.update({ where: { id }, data: { createdAt: instant } });

    const [row] = await db.$queryRaw<{ epoch: number }[]>`
      SELECT extract(epoch FROM created_at)::float8 AS epoch
      FROM "user" WHERE id = ${id}`;
    expect(new Date(Math.round((row?.epoch ?? 0) * 1000)).toISOString()).toBe(
      instant.toISOString(),
    );
  });
});
