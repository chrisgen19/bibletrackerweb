import "server-only";

import { cookies } from "next/headers";

import { getTimeZone } from "@/lib/dal";
import { isValidTimeZone } from "@/utils/zoned-date-key";

/**
 * The browser's timezone, set by the `syncTimeZone` action. A cookie rather than only the
 * stored setting because "today" belongs to the device, as on iOS: a phone in Manila and
 * a laptop in Los Angeles each see their own day.
 */
export const TIME_ZONE_COOKIE = "tz";

/** About 400 days, the longest lifetime browsers allow for a cookie. */
export const TIME_ZONE_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

export interface ReaderTimeZone {
  readonly timeZone: string;
  /** True when this device's own cookie supplied it, not the account-wide fallback. */
  readonly fromDevice: boolean;
}

/**
 * The zone to compute "today" in when rendering on the server: this device's cookie, then
 * the reader's last stored zone, then UTC. The browser corrects it after loading if it
 * differs, so a wrong guess only lasts until hydration. `fromDevice` tells the browser
 * whether it still needs to set its own cookie.
 */
export async function resolveReaderTimeZone(
  userId: string,
): Promise<ReaderTimeZone> {
  const fromCookie = (await cookies()).get(TIME_ZONE_COOKIE)?.value;
  if (fromCookie !== undefined && isValidTimeZone(fromCookie)) {
    return { timeZone: fromCookie, fromDevice: true };
  }
  return { timeZone: (await getTimeZone(userId)) ?? "UTC", fromDevice: false };
}
