import { beforeEach, describe, expect, it, vi } from "vitest";

import { createReadingPlan } from "@/lib/dal";
import { createTestUser, makeDraft } from "@/test/factories";

const { getCurrentUser } = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/session", () => ({ getCurrentUser }));

import { GET } from "../route";

beforeEach(() => {
  getCurrentUser.mockReset();
});

describe("GET /api/reading/snapshot", () => {
  it("answers 401 without a session", async () => {
    getCurrentUser.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns only the signed-in reader's snapshot, uncached", async () => {
    const reader = await createTestUser();
    const someoneElse = await createTestUser();
    await createReadingPlan(someoneElse, makeDraft({ startBookId: "MAT" }));
    const plan = await createReadingPlan(reader, makeDraft());

    getCurrentUser.mockResolvedValue({
      id: reader,
      name: "R",
      email: "r@x.test",
      image: null,
    });
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.plans.map((p: { id: string }) => p.id)).toEqual([plan.id]);
    expect(body.activePlan.startBookId).toBe("GEN");
  });
});
