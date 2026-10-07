import "server-only";

import { cookies } from "next/headers";

import { getTimeZone } from "@/lib/dal";
import { TIME_ZONE_COOKIE } from "@/lib/time-zone-cookie";
import { isValidTimeZone } from "@/utils/zoned-date-key";

// The browser's timezone lives in a cookie (see time-zone-cookie.ts) rather than only the
// stored setting because "today" belongs to the device, as on iOS: a phone in Manila and
// a laptop in Los Angeles each see their own day.

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
