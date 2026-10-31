import { describe, expect, it } from "vitest";

import { type FriendsErrorCode, friendsErrorMessage } from "../results";

const COPY: Record<FriendsErrorCode, string> = {
  "invalid-input": "Something went wrong. Reload the page and try again.",
  "username-required": "Pick a username first.",
  "username-taken": "That username is taken.",
  "username-just-taken": "That username was just taken.",
  "not-found": "That request is no longer there.",
  self: "That's you.",
  "too-many-pending":
    "You have a lot of requests waiting. Cancel some before sending more.",
  "friend-limit": "One of you has reached the friend limit.",
  network: "Couldn't save that. Check your connection and try again.",
};

describe("friendsErrorMessage", () => {
  it.each(
    Object.entries(COPY),
  )("has the agreed copy for %s", (code, message) => {
    expect(friendsErrorMessage(code as FriendsErrorCode)).toBe(message);
  });
});
