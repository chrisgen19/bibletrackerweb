import { describe, expect, it } from "vitest";

import { getTodayDateKey, isValidDateKey } from "../date-key";
import { getTodayDateKeyInZone, isValidTimeZone } from "../zoned-date-key";

const at = (iso: string) => new Date(iso);

describe("getTodayDateKeyInZone", () => {
  it("gives a Manila reader their own day while UTC is still on yesterday", () => {
    // 7 AM in Manila (UTC+8) is 11 PM the previous day in UTC.
    const morningInManila = at("2026-10-05T23:00:00Z");
    expect(getTodayDateKeyInZone("Asia/Manila", morningInManila)).toBe(
      "2026-10-06",
    );
    expect(getTodayDateKeyInZone("UTC", morningInManila)).toBe("2026-10-05");
  });

  it("handles both sides of the date line", () => {
    const instant = at("2026-10-06T11:00:00Z");
    expect(getTodayDateKeyInZone("Pacific/Kiritimati", instant)).toBe(
      "2026-10-07",
    ); // UTC+14
    expect(getTodayDateKeyInZone("Pacific/Pago_Pago", instant)).toBe(
      "2026-10-06",
    ); // UTC-11
  });

  it("follows daylight saving in Los Angeles", () => {
    // Spring forward on 8 March 2026: still PST (UTC-8) until 2 AM.
    expect(
      getTodayDateKeyInZone("America/Los_Angeles", at("2026-03-08T07:59:00Z")),
    ).toBe("2026-03-07");
    expect(
      getTodayDateKeyInZone("America/Los_Angeles", at("2026-03-08T09:59:00Z")),
    ).toBe("2026-03-08");
    // Fall back on 1 November 2026: PDT (UTC-7) until 2 AM.
    expect(
      getTodayDateKeyInZone("America/Los_Angeles", at("2026-11-01T06:59:00Z")),
    ).toBe("2026-10-31");
    expect(
      getTodayDateKeyInZone("America/Los_Angeles", at("2026-11-01T07:30:00Z")),
    ).toBe("2026-11-01");
  });

  it("matches getTodayDateKey when given the runtime's own zone", () => {
    // Run under several TZ values by `pnpm test:tz`; this is what ties the server-side
    // helper to the ported, runtime-local one.
    const ownZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const start = at("2026-01-01T00:00:00Z").getTime();
    const sevenHours = 7 * 60 * 60 * 1000;
    for (
      let t = start;
      t < start + 366 * 24 * 60 * 60 * 1000;
      t += sevenHours
    ) {
      const instant = new Date(t);
      expect(getTodayDateKeyInZone(ownZone, instant)).toBe(
        getTodayDateKey(instant),
      );
    }
  });

  it("always produces a valid DateKey", () => {
    expect(isValidDateKey(getTodayDateKeyInZone("Asia/Manila"))).toBe(true);
  });

  it("throws a RangeError for an unknown zone", () => {
    expect(() => getTodayDateKeyInZone("Mars/Olympus_Mons")).toThrow(
      RangeError,
    );
  });
});

describe("isValidTimeZone", () => {
  it("accepts IANA zones and UTC", () => {
    expect(isValidTimeZone("Asia/Manila")).toBe(true);
    expect(isValidTimeZone("America/Los_Angeles")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
  });

  it("rejects unknown and empty zones", () => {
    expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});
