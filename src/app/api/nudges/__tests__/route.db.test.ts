import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  acceptFriendRequest,
  sendFriendRequest,
  sendNudge,
} from "@/lib/friends-dal";
import { createTestUser } from "@/test/factories";

const { getCurrentUser } = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/session", () => ({ getCurrentUser }));

import { GET } from "../route";

/** A valid username, unique per call (the column is unique across parallel test files). */
const uniqueName = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;

function signIn(id: string) {
  getCurrentUser.mockResolvedValue({
    id,
    name: "R",
    email: "r@x.test",
    image: null,
  });
}

const call = () => GET(new Request("http://localhost/api/nudges"));

beforeEach(() => {
  getCurrentUser.mockReset();
});

describe("GET /api/nudges", () => {
  it("answers 401 without a session", async () => {
    getCurrentUser.mockResolvedValue(null);
    const response = await call();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
  });

  it("returns the reader's open nudges", async () => {
    const reader = await createTestUser({ username: uniqueName("reader") });
    const maria = await createTestUser({
      username: uniqueName("maria"),
      name: "Maria",
    });
    await sendFriendRequest(reader, maria);
    await acceptFriendRequest(maria, reader);
    await sendNudge(maria, reader);
    signIn(reader);

    const response = await call();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      senders: [
        {
          userId: maria,
          username: expect.stringMatching(/^maria_/),
          name: "Maria",
          image: null,
        },
      ],
    });
  });

  it("returns no one else's nudges", async () => {
    const reader = await createTestUser({ username: uniqueName("reader") });
    const maria = await createTestUser({ username: uniqueName("maria") });
    const other = await createTestUser({ username: uniqueName("other") });
    await sendFriendRequest(reader, maria);
    await acceptFriendRequest(maria, reader);
    await sendNudge(maria, reader);
    signIn(other);

    const response = await call();

    expect(await response.json()).toEqual({ senders: [] });
  });
});
