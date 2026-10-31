import { beforeEach, describe, expect, it, vi } from "vitest";

import { createReadingPlan } from "@/lib/dal";
import { acceptFriendRequest, sendFriendRequest } from "@/lib/friends-dal";
import { createTestUser, makeDraft } from "@/test/factories";

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

function call(username: string) {
  return GET(new Request("http://localhost/api/friends/x/reading"), {
    params: Promise.resolve({ username }),
  } as RouteContext<"/api/friends/[username]/reading">);
}

beforeEach(() => {
  getCurrentUser.mockReset();
});

describe("GET /api/friends/[username]/reading", () => {
  it("answers 401 without a session", async () => {
    getCurrentUser.mockResolvedValue(null);
    const response = await call("anyone");
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
  });

  it("returns a friend's reading, uncached", async () => {
    const viewer = await createTestUser({ username: uniqueName("viewer") });
    const friendName = uniqueName("maria");
    const friend = await createTestUser({ username: friendName });
    const plan = await createReadingPlan(friend, makeDraft());
    await createReadingPlan(viewer, makeDraft({ startBookId: "MAT" }));
    await sendFriendRequest(viewer, friend);
    await acceptFriendRequest(friend, viewer);
    signIn(viewer);

    const response = await call(friendName);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.snapshot.plans.map((p: { id: string }) => p.id)).toEqual([
      plan.id,
    ]);
    expect(body.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("answers 404 for a non-friend, a pending request and self, with the same body", async () => {
    const viewerName = uniqueName("viewer");
    const viewer = await createTestUser({ username: viewerName });
    const strangerName = uniqueName("stranger");
    await createTestUser({ username: strangerName });
    const pendingName = uniqueName("pending");
    const pending = await createTestUser({ username: pendingName });
    await sendFriendRequest(viewer, pending);
    signIn(viewer);

    for (const username of [strangerName, pendingName, viewerName]) {
      const response = await call(username);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "not-found" });
    }
  });
});
