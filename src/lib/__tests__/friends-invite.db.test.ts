// Usernames and invite links (spec: 2026-10-31-friends-connections-design.md): the
// friends DAL's first half, against the real test database.
import { beforeEach, describe, expect, it } from "vitest";

import {
  findInviteOwner,
  findUserByUsername,
  getOrCreateInvite,
  getUsername,
  resetInvite,
  setUsername,
} from "@/lib/friends-dal";
import { createTestUser } from "@/test/factories";

/** A valid username, unique per call (the column is unique across tests). */
const uniqueName = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;

let aliceName: string;
let alice: string;
let bob: string;

beforeEach(async () => {
  aliceName = uniqueName("maria");
  alice = await createTestUser({ name: "Maria", username: aliceName });
  bob = await createTestUser();
});

describe("invite links", () => {
  it("returns the same code until reset, then a different one", async () => {
    const first = await getOrCreateInvite(alice);
    expect(await getOrCreateInvite(alice)).toBe(first);
    const next = await resetInvite(alice);
    expect(next).not.toBe(first);
    expect(await getOrCreateInvite(alice)).toBe(next);
  });

  it("makes the old code resolve to nobody after reset", async () => {
    const old = await getOrCreateInvite(alice);
    await resetInvite(alice);
    expect(await findInviteOwner(old)).toBeNull();
  });

  it("creates the invite on reset when none exists", async () => {
    const code = await resetInvite(bob);
    expect(await getOrCreateInvite(bob)).toBe(code);
  });

  it("returns null for malformed codes without throwing", async () => {
    expect(await findInviteOwner("../x")).toBeNull();
    expect(await findInviteOwner("")).toBeNull();
  });

  it("returns the owner's name, photo and username, never email", async () => {
    const code = await getOrCreateInvite(alice);
    const owner = await findInviteOwner(code);
    expect(Object.keys(owner ?? {}).sort()).toEqual([
      "image",
      "name",
      "userId",
      "username",
    ]);
    expect(owner).toEqual({
      userId: alice,
      username: aliceName,
      name: "Maria",
      image: null,
    });
  });

  it("returns null when the owner has no username", async () => {
    const code = await getOrCreateInvite(bob);
    expect(await findInviteOwner(code)).toBeNull();
  });
});

describe("usernames", () => {
  it("reports a taken username", async () => {
    expect(await setUsername(bob, aliceName)).toBe("taken");
    expect(await getUsername(bob)).toBeNull();
  });

  it("lets a reader change their username and frees the old one", async () => {
    const next = uniqueName("marie");
    expect(await setUsername(alice, next)).toBe("ok");
    expect(await getUsername(alice)).toBe(next);
    expect(await setUsername(bob, aliceName)).toBe("ok");
  });

  it("finds by exact username only and returns only id and username", async () => {
    expect(await findUserByUsername(aliceName.slice(0, -1))).toBeNull();
    expect(await findUserByUsername(aliceName)).toEqual({
      userId: alice,
      username: aliceName,
    });
  });
});
