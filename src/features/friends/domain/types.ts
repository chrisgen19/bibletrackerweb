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

export interface FriendsOverview {
  /** Sorted by name, case-insensitive. */
  readonly friends: readonly FriendProfile[];
  /** Newest first. */
  readonly incoming: readonly FriendProfile[];
  /** Newest first. */
  readonly outgoing: readonly PublicHandle[];
}
