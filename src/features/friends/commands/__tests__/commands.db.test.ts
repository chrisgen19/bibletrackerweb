import { beforeEach, describe, expect, it } from "vitest";

import { getRelationship, getUsername } from "@/lib/friends-dal";
import { createTestUser } from "@/test/factories";

import {
  acceptRequestFor,
  cancelRequestFor,
  declineRequestFor,
  getInviteCodeFor,
  removeFriendFor,
  resetInviteFor,
  searchUsernameFor,
  sendRequestByInviteFor,
  sendRequestFor,
  setUsernameFor,
} from "../commands";

/** A valid username, unique per call (the column is unique across parallel test files). */
const uniqueName = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;

let aliceName: string;
let alice: string;
let bob: string;
let noName: string;

beforeEach(async () => {
  aliceName = uniqueName("maria");
  alice = await createTestUser({ name: "Maria", username: aliceName });
  bob = await createTestUser({ username: uniqueName("bob") });
  noName = await createTestUser();
});

describe("setUsernameFor", () => {
  it("normalises and saves a username", async () => {
    const name = uniqueName("maria");
    expect(
      await setUsernameFor(noName, { username: ` @${name.toUpperCase()}` }),
    ).toEqual({ ok: true });
    expect(await getUsername(noName)).toBe(name);
  });

  it("refuses reserved and malformed usernames as invalid-input", async () => {
    for (const username of ["admin", "ab", "has space", "x".repeat(21), "@"]) {
      expect(await setUsernameFor(noName, { username })).toEqual({
        ok: false,
        error: "invalid-input",
      });
    }
    expect(await getUsername(noName)).toBeNull();
  });

  it("reports a username another reader has as username-taken", async () => {
    expect(await setUsernameFor(bob, { username: aliceName })).toEqual({
      ok: false,
      error: "username-taken",
    });
  });

  it("accepts your own current username", async () => {
    expect(await setUsernameFor(alice, { username: aliceName })).toEqual({
      ok: true,
    });
  });
});

describe("searchUsernameFor", () => {
  it("finds a reader by exact handle without name or photo", async () => {
    expect(
      await searchUsernameFor(bob, { query: `@${aliceName.toUpperCase()}` }),
    ).toEqual({
      ok: true,
      match: {
        handle: { userId: alice, username: aliceName },
        relationship: "none",
      },
    });
  });

  it("returns no match for a partial or malformed query", async () => {
    for (const query of [
      aliceName.slice(0, -2),
      "no spaces allowed",
      "",
      "@@",
    ]) {
      expect(await searchUsernameFor(bob, { query })).toEqual({
        ok: true,
        match: null,
      });
    }
  });

  it("returns no match for a query longer than 64 characters", async () => {
    expect(await searchUsernameFor(bob, { query: "a".repeat(65) })).toEqual({
      ok: true,
      match: null,
    });
    expect(await searchUsernameFor(bob, { query: 5 })).toEqual({
      ok: false,
      error: "invalid-input",
    });
  });

  it("marks your own handle as self", async () => {
    expect(await searchUsernameFor(alice, { query: aliceName })).toEqual({
      ok: true,
      match: {
        handle: { userId: alice, username: aliceName },
        relationship: "self",
      },
    });
  });
});

describe("sending requests", () => {
  it("refuses a target with no username as not-found and creates no row", async () => {
    expect(await sendRequestFor(alice, { userId: noName })).toEqual({
      ok: false,
      error: "not-found",
    });
    expect(await getRelationship(alice, noName)).toBe("none");
  });

  it("refuses to send without a username", async () => {
    expect(await sendRequestFor(noName, { userId: alice })).toEqual({
      ok: false,
      error: "username-required",
    });
  });

  it("refuses to befriend yourself", async () => {
    expect(await sendRequestFor(alice, { userId: alice })).toEqual({
      ok: false,
      error: "self",
    });
  });

  it("sends, then accepts, then removes", async () => {
    expect(await sendRequestFor(bob, { userId: alice })).toEqual({ ok: true });
    expect(await sendRequestFor(bob, { userId: alice })).toEqual({ ok: true });
    expect(await acceptRequestFor(alice, { userId: bob })).toEqual({
      ok: true,
    });
    expect(await removeFriendFor(bob, { userId: alice })).toEqual({ ok: true });
  });

  it("sends through an invite code and refuses an old one", async () => {
    const first = await getInviteCodeFor(alice);
    if (!first.ok) throw new Error("expected a code");
    expect(await sendRequestByInviteFor(bob, { code: first.code })).toEqual({
      ok: true,
    });

    const next = await resetInviteFor(alice);
    if (!next.ok) throw new Error("expected a code");
    expect(next.code).not.toBe(first.code);
    expect(await sendRequestByInviteFor(bob, { code: first.code })).toEqual({
      ok: false,
      error: "not-found",
    });
  });

  it("requires a username for invite codes", async () => {
    expect(await getInviteCodeFor(noName)).toEqual({
      ok: false,
      error: "username-required",
    });
    expect(await resetInviteFor(noName)).toEqual({
      ok: false,
      error: "username-required",
    });
  });

  it("maps a request that is already gone to not-found", async () => {
    const gone = { ok: false, error: "not-found" };
    expect(await acceptRequestFor(alice, { userId: bob })).toEqual(gone);
    expect(await declineRequestFor(alice, { userId: bob })).toEqual(gone);
    expect(await cancelRequestFor(alice, { userId: bob })).toEqual(gone);
    expect(await removeFriendFor(alice, { userId: bob })).toEqual(gone);
  });
});

describe("input shape", () => {
  it("rejects input of the wrong shape as invalid-input", async () => {
    expect(await acceptRequestFor(alice, { userId: 42 })).toEqual({
      ok: false,
      error: "invalid-input",
    });
  });
});
