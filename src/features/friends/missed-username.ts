/**
 * Remembers, in this browser, a username picked at sign-up that turned out to be taken,
 * so the Friends username step can say why it is asking again.
 *
 * Kept with the account's id: on a shared device, another reader must not see it.
 * Storage can be missing or blocked (private windows), so every call fails quietly and
 * the step simply shows without the note.
 */

const STORAGE_KEY = "friends:missed-username";

interface MissedUsername {
  userId: string;
  username: string;
}

function isMissedUsername(value: unknown): value is MissedUsername {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.userId === "string" && typeof entry.username === "string";
}

export const rememberMissedUsername = (entry: MissedUsername): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // No storage: the step shows without the note.
  }
};

/** The username this reader missed at sign-up, or `null`. */
export const readMissedUsername = (userId: string): string | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const entry: unknown = JSON.parse(raw);
    return isMissedUsername(entry) && entry.userId === userId
      ? entry.username
      : null;
  } catch {
    return null;
  }
};

export const forgetMissedUsername = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
};
