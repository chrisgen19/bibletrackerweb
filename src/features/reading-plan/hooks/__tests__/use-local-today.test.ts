import { describe, expect, it } from "vitest";

import { needsTimeZoneSync } from "../use-local-today";

describe("needsTimeZoneSync", () => {
  it.each([
    // device zone, zone the server rendered with, came from this device's cookie, expected
    ["America/Los_Angeles", "America/Los_Angeles", true, false],
    ["America/Los_Angeles", "Asia/Manila", true, true],
    ["America/Los_Angeles", "UTC", false, true],
    // Review on #7: matching the account-wide fallback is not the same as having a cookie.
    ["America/Los_Angeles", "America/Los_Angeles", false, true],
  ] as const)("device %s, rendered %s (fromDevice %s) -> %s", (device, rendered, fromDevice, expected) => {
    expect(needsTimeZoneSync(device, rendered, fromDevice)).toBe(expected);
  });
});
