import type {
  PublicHandle,
  Relationship,
} from "@/features/friends/domain/types";

/**
 * Why a friends command was refused. Each has plain copy in `friendsErrorMessage`, so a
 * Server Action never sends a raw error to the browser.
 */
export type FriendsErrorCode =
  /** The input failed validation (a tampered or out-of-date client). */
  | "invalid-input"
  /** Sending and sharing a link need a username first. */
  | "username-required"
  | "username-taken"
  /** Lost the race: it was free when checked, taken by the time it was saved. */
  | "username-just-taken"
  /** The request, friend or invite is gone. */
  | "not-found"
  | "self"
  | "too-many-pending"
  | "friend-limit"
  /** The action call itself threw (offline, a dropped connection). Set by the client only. */
  | "network";

export type FriendsResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: FriendsErrorCode };

export interface SearchMatch {
  readonly handle: PublicHandle;
  readonly relationship: Relationship;
}

export type SearchResult =
  | { readonly ok: true; readonly match: SearchMatch | null }
  | { readonly ok: false; readonly error: FriendsErrorCode };

export type InviteCodeResult =
  | { readonly ok: true; readonly code: string }
  | { readonly ok: false; readonly error: FriendsErrorCode };

export function friendsErrorMessage(code: FriendsErrorCode): string {
  switch (code) {
    case "invalid-input":
      return "Something went wrong. Reload the page and try again.";
    case "username-required":
      return "Pick a username first.";
    case "username-taken":
      return "That username is taken.";
    case "username-just-taken":
      return "That username was just taken.";
    case "not-found":
      return "That request is no longer there.";
    case "self":
      return "That's you.";
    case "too-many-pending":
      return "You have a lot of requests waiting. Cancel some before sending more.";
    case "friend-limit":
      return "One of you has reached the friend limit.";
    case "network":
      return "Couldn't save that. Check your connection and try again.";
  }
}
