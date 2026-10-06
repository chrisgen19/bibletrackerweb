import type { DateKey } from "./date-key";

/**
 * Day keys for an explicit IANA timezone.
 *
 * Everything in `date-key.ts` (ported unchanged from the iOS app) uses the runtime's own
 * timezone. That is right in the browser, where the runtime *is* the reader's device,
 * but wrong on a server running UTC: at 7 AM in Manila it is still the previous day in
 * UTC, so a reading marked then would land on the wrong date. The server resolves
 * "today" with the reader's stored timezone instead.
 */

/**
 * True when the runtime recognises `timeZone`, e.g. `Asia/Manila`.
 *
 * Stored zones come from the browser, so check before use: an unknown zone makes
 * `Intl.DateTimeFormat` throw a RangeError.
 */
export function isValidTimeZone(timeZone: string): boolean {
  if (timeZone.length === 0) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Today's {@link DateKey} as seen from `timeZone`.
 *
 * Built from `formatToParts` rather than a locale that happens to print `YYYY-MM-DD`,
 * so the result does not depend on locale data.
 *
 * @throws RangeError when `timeZone` is not a recognised IANA zone.
 */
export function getTodayDateKeyInZone(
  timeZone: string,
  now: Date = new Date(),
): DateKey {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}
