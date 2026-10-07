"use client";

import { useEffect } from "react";

import {
  TIME_ZONE_COOKIE,
  TIME_ZONE_COOKIE_MAX_AGE,
} from "@/lib/time-zone-cookie";

/**
 * Sets this device's timezone cookie on the sign-in and sign-up screens.
 *
 * Without it, the first page after signing up was worked out in UTC (a new account has
 * no stored zone yet), so in Manila before 8am it opened on yesterday until the browser
 * corrected it. A new account also takes this zone as its own (see `databaseHooks` in
 * src/lib/auth.ts), for both email and Google sign-up.
 */
export function DeviceTimeZone() {
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // biome-ignore lint/suspicious/noDocumentCookie: a plain preference cookie, also set by the syncTimeZone action
    document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=${TIME_ZONE_COOKIE_MAX_AGE}; samesite=lax`;
  }, []);
  return null;
}
