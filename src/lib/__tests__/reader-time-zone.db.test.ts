import { beforeEach, describe, expect, it, vi } from "vitest";

import { setTimeZone } from "@/lib/dal";
import { createTestUser } from "@/test/factories";

const { cookieValue } = vi.hoisted(() => ({
  cookieValue: { current: undefined as string | undefined },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "tz" && cookieValue.current !== undefined
        ? { name, value: cookieValue.current }
        : undefined,
  }),
}));

import { resolveReaderTimeZone } from "../reader-time-zone";

let user: string;

beforeEach(async () => {
  user = await createTestUser();
  cookieValue.current = undefined;
});

describe("resolveReaderTimeZone", () => {
  it("uses this device's cookie and says so", async () => {
    await setTimeZone(user, "Asia/Manila");
    cookieValue.current = "America/Los_Angeles";
    expect(await resolveReaderTimeZone(user)).toEqual({
      timeZone: "America/Los_Angeles",
      fromDevice: true,
    });
  });

  it("falls back to the stored zone, marked as not this device's", async () => {
    await setTimeZone(user, "Asia/Manila");
    expect(await resolveReaderTimeZone(user)).toEqual({
      timeZone: "Asia/Manila",
      fromDevice: false,
    });
  });

  it("ignores a cookie that is not a real zone", async () => {
    await setTimeZone(user, "Asia/Manila");
    cookieValue.current = "Mars/Base";
    expect(await resolveReaderTimeZone(user)).toEqual({
      timeZone: "Asia/Manila",
      fromDevice: false,
    });
  });

  it("uses UTC when nothing is known yet", async () => {
    expect(await resolveReaderTimeZone(user)).toEqual({
      timeZone: "UTC",
      fromDevice: false,
    });
  });
});
