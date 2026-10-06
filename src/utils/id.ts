/**
 * Collision-free identifier for new rows (an RFC 4122 v4 UUID).
 *
 * Replaces the iOS app's `expo-crypto` version: `crypto.randomUUID` is built into
 * Node and every browser this app targets.
 */
export function createId(): string {
  return crypto.randomUUID();
}
