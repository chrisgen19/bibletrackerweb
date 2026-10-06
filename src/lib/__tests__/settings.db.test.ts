// The parts of bibletrackerapp's settings-repository the web keeps (appearance), plus the
// reader's timezone, which only the web needs.
import { beforeEach, describe, expect, it } from "vitest";

import {
  clearAllSettings,
  getAppearancePreference,
  getTimeZone,
  setAppearancePreference,
  setTimeZone,
} from "@/lib/dal";
import { db } from "@/lib/db";
import { createTestUser } from "@/test/factories";

let user: string;

beforeEach(async () => {
  user = await createTestUser();
});

describe("appearance", () => {
  it("defaults to system", async () => {
    expect(await getAppearancePreference(user)).toBe("system");
  });

  it("stores and overwrites the preference", async () => {
    await setAppearancePreference(user, "dark");
    await setAppearancePreference(user, "light");
    expect(await getAppearancePreference(user)).toBe("light");
  });

  it("degrades a corrupt stored value to the default", async () => {
    await db.appSetting.create({
      data: { userId: user, key: "appearance", value: "sepia" },
    });
    expect(await getAppearancePreference(user)).toBe("system");
  });
});

describe("timezone", () => {
  it("is null until the browser reports one", async () => {
    expect(await getTimeZone(user)).toBeNull();
  });

  it("stores an IANA zone", async () => {
    await setTimeZone(user, "Asia/Manila");
    expect(await getTimeZone(user)).toBe("Asia/Manila");
  });

  it("refuses to store an unknown zone", async () => {
    await expect(setTimeZone(user, "Mars/Olympus_Mons")).rejects.toThrow(
      RangeError,
    );
    expect(await getTimeZone(user)).toBeNull();
  });

  it("ignores a stored zone the runtime does not know", async () => {
    await db.appSetting.create({
      data: { userId: user, key: "time_zone", value: "Nowhere/Land" },
    });
    expect(await getTimeZone(user)).toBeNull();
  });
});

describe("clearAllSettings", () => {
  it("removes every preference for the reader", async () => {
    await setAppearancePreference(user, "dark");
    await setTimeZone(user, "Asia/Manila");
    await clearAllSettings(user);
    expect(await getAppearancePreference(user)).toBe("system");
    expect(await getTimeZone(user)).toBeNull();
  });
});
