import { describe, expect, it } from "vitest";

import { fromDbDate, toDbDate } from "../db-date";

// Runs under UTC, Asia/Manila and America/Los_Angeles via `pnpm test:tz`: the day must
// survive the round trip whatever the process timezone.
describe("toDbDate / fromDbDate", () => {
  it.each([
    "2026-08-01",
    "2026-01-01",
    "2026-12-31",
    "2028-02-29",
    "2026-03-08", // LA spring-forward day
    "2026-11-01", // LA fall-back day
  ])("round-trips %s", (key) => {
    expect(fromDbDate(toDbDate(key))).toBe(key);
  });

  it("stores the day at UTC midnight, which is what Postgres `date` expects", () => {
    expect(toDbDate("2026-08-01").toISOString()).toBe(
      "2026-08-01T00:00:00.000Z",
    );
  });

  it("reads Prisma's UTC-midnight Date back as the same day", () => {
    expect(fromDbDate(new Date("2026-08-01T00:00:00.000Z"))).toBe("2026-08-01");
  });

  it.each(["2026-02-30", "2026-8-1", "not-a-date", ""])("rejects %j", (key) => {
    expect(() => toDbDate(key)).toThrow(RangeError);
  });
});
