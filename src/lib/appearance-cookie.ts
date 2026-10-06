import "server-only";

import { cookies } from "next/headers";

import { TIME_ZONE_COOKIE_MAX_AGE } from "@/lib/reader-time-zone";
import { type AppearancePreference, appearanceSchema } from "@/lib/settings";

/**
 * This device's appearance choice, set by the `setAppearance` action. The root layout
 * renders it onto <html> so the first paint is already in the right mode; the stored
 * setting is the account-wide copy a new device starts from.
 */
export const APPEARANCE_COOKIE = "appearance";

/** As long as the time zone cookie: the longest browsers allow. */
export const APPEARANCE_COOKIE_MAX_AGE = TIME_ZONE_COOKIE_MAX_AGE;

/** This device's choice, or null when it has none (or an unreadable one). */
export async function readAppearanceCookie(): Promise<AppearancePreference | null> {
  const parsed = appearanceSchema.safeParse(
    (await cookies()).get(APPEARANCE_COOKIE)?.value,
  );
  return parsed.success ? parsed.data : null;
}
