import { z } from "zod";

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

/** Names nobody may claim: they read as the app or as routes. */
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  "admin",
  "support",
  "bibletracker",
  "friends",
  "add",
  "me",
]);

/** Trim, strip one leading "@", lowercase. Does not validate. */
export const normalizeUsername = (raw: string): string => {
  const trimmed = raw.trim();
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  return withoutAt.toLowerCase();
};

/**
 * A username as typed by a person. The output is the normalised, stored form, so the
 * same schema serves the client form and server inputs. The input stays `string` (not
 * `unknown`) so form resolvers type their fields correctly.
 */
export const usernameSchema = z
  .string()
  .transform(normalizeUsername)
  .pipe(
    z
      .string()
      .regex(USERNAME_PATTERN, "Use 3 to 20 letters, numbers or underscores.")
      .refine(
        (value) => !RESERVED_USERNAMES.has(value),
        "That username isn't available.",
      ),
  );
