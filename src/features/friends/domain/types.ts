import type { ReadingSnapshot } from "@/lib/dal";
import type { DateKey } from "@/utils/date-key";

export const MAX_PENDING_OUTGOING = 50;
export const MAX_FRIENDS = 500;
export const DECLINE_ALL_THRESHOLD = 5;

/** What anyone may see: search results and the Sent list. */
export interface PublicHandle {
  readonly userId: string;
  readonly username: string;
}

/** Invite owner, incoming requester, or friend. */
export interface FriendProfile extends PublicHandle {
  readonly name: string;
  readonly image: string | null;
}

export type Relationship =
  | "none"
  | "self"
  | "friends"
  | "outgoing"
  | "incoming";

/**
 * Whether a friend has logged a reading on their own today (their time zone, not the
 * viewer's). "no-plan" is a friend with no active reading plan, who has nothing to read.
 */
export type ReadTodayStatus = "read" | "not-yet" | "no-plan";

/** A friend on the Friends list, with their read-today status. */
export interface FriendListEntry extends FriendProfile {
  readonly readToday: ReadTodayStatus;
}

export interface FriendsOverview {
  /** Sorted by name, case-insensitive. */
  readonly friends: readonly FriendListEntry[];
  /** Newest first. */
  readonly incoming: readonly FriendProfile[];
  /** Newest first. */
  readonly outgoing: readonly PublicHandle[];
}

/** A friend's reading data, with "today" worked out in the friend's own time zone. */
export interface FriendReading {
  readonly snapshot: ReadingSnapshot;
  readonly today: DateKey;
}

/**
 * The outcome of opening a friend's profile. "not-found" covers an unknown or malformed
 * username and every relationship short of accepted, so a stranger cannot tell them apart.
 */
export type FriendReadingLookup =
  | { readonly kind: "self" }
  | { readonly kind: "not-found" }
  | {
      readonly kind: "friend";
      readonly profile: FriendProfile;
      readonly reading: FriendReading;
    };
