import { type DateKey, isValidDateKey } from "@/utils/date-key";

/**
 * The only crossing between domain day keys and Postgres `date` columns.
 *
 * Prisma maps `@db.Date` to a JS `Date` at UTC midnight. Both directions stay in UTC, so
 * the server's own timezone can never shift a day: `2026-08-01` is stored and read back
 * as `2026-08-01` whether the process runs in UTC, Manila or Los Angeles.
 */

/** @throws RangeError when `key` is not a real `YYYY-MM-DD` day. */
export function toDbDate(key: DateKey): Date {
  if (!isValidDateKey(key))
    throw new RangeError(`Not a valid day key: "${key}"`);
  return new Date(`${key}T00:00:00.000Z`);
}

export function fromDbDate(value: Date): DateKey {
  return value.toISOString().slice(0, 10);
}
