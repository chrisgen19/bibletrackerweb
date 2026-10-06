// New for the web: database-level guarantees that SQLite on one device never needed,
// because two devices can now write for the same reader at the same time.
import { beforeEach, describe, expect, it } from "vitest";

import type { ReadingPlan } from "@/features/reading-plan/domain/types";
import {
  createReadingPlan,
  getActiveReadingPlan,
  getAllReadingPlans,
  getReadingSnapshot,
  markReadingComplete,
  replaceActiveReadingPlan,
} from "@/lib/dal";
import { db } from "@/lib/db";
import { waitForReaderLockWaiter } from "@/test/db-locks";
import { createTestUser, makeDraft, replacePlan } from "@/test/factories";

let user: string;

beforeEach(async () => {
  user = await createTestUser();
});

describe("two devices changing the position at once", () => {
  it("waits for a change already in progress, then builds on it", async () => {
    // Deterministic version of the race. Device A runs the same steps as
    // replaceActiveReadingPlan, under the same per-reader lock, and is held open just
    // before committing. Device B's change must wait for it, then close A's new segment.
    // Without the lock, B cannot see A's uncommitted segment, inserts its own, and the
    // one-open-plan index rejects it.
    await createReadingPlan(user, makeDraft());

    let commitDeviceA = () => {};
    const committed = new Promise<void>((resolve) => {
      commitDeviceA = resolve;
    });
    let markDeviceAReady = () => {};
    const deviceAReady = new Promise<void>((resolve) => {
      markDeviceAReady = resolve;
    });

    const deviceA = db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${user}, 0))`;
        await tx.readingPlan.updateMany({
          where: { userId: user, isActive: true },
          data: { isActive: false, endDate: new Date("2026-08-08T00:00:00Z") },
        });
        await tx.readingPlan.create({
          data: {
            userId: user,
            startDate: new Date("2026-08-09T00:00:00Z"),
            startBookId: "MAT",
            startChapter: 1,
          },
        });
        markDeviceAReady();
        await committed;
      },
      { timeout: 15_000 },
    );

    await deviceAReady;
    const deviceB = replacePlan(
      user,
      makeDraft({ startDate: "2026-08-09", startBookId: "MRK" }),
    );
    // Only commit once device B is blocked behind device A's lock.
    await waitForReaderLockWaiter(user);
    commitDeviceA();
    await deviceA;
    const fromDeviceB = await deviceB;

    const plans = await getAllReadingPlans(user);
    expect(plans).toHaveLength(3);
    expect(
      plans.filter((plan) => plan.isActive).map((plan) => plan.id),
    ).toEqual([fromDeviceB.id]);
    expect(plans.find((plan) => plan.startBookId === "MAT")).toMatchObject({
      isActive: false,
      endDate: "2026-08-08",
    });
  });

  it("applies both changes in turn and leaves exactly one open segment", async () => {
    await createReadingPlan(user, makeDraft());

    const results = await Promise.all([
      replacePlan(
        user,
        makeDraft({ startDate: "2026-08-09", startBookId: "MAT" }),
      ),
      replacePlan(
        user,
        makeDraft({ startDate: "2026-08-09", startBookId: "MRK" }),
      ),
    ]);

    const plans = await getAllReadingPlans(user);
    expect(plans).toHaveLength(3);
    expect(plans.filter((plan) => plan.isActive)).toHaveLength(1);
    // Whichever ran second is the open segment; the first was closed by it.
    const active = await getActiveReadingPlan(user);
    expect(results.map((plan) => plan.id)).toContain(active?.id);
  });

  it("lets only one of two simultaneous onboardings through", async () => {
    // A double-submitted onboarding form. The partial unique index allows one open
    // segment per reader, so the second insert fails instead of leaving two.
    const outcomes = await Promise.allSettled([
      createReadingPlan(user, makeDraft()),
      createReadingPlan(user, makeDraft()),
    ]);

    expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter((o) => o.status === "rejected")).toHaveLength(1);
    expect(await getAllReadingPlans(user)).toHaveLength(1);
  });
});

describe("CHECK constraints", () => {
  let plan: ReadingPlan;

  beforeEach(async () => {
    plan = await createReadingPlan(user, makeDraft());
  });

  function record(verses: { from: number; to: number }) {
    return markReadingComplete(user, {
      readingPlanId: plan.id,
      localDate: "2026-08-01",
      chapters: [{ bookId: "GEN", chapter: 1 }],
      verses,
    });
  }

  it("rejects a reversed verse span", async () => {
    await expect(record({ from: 10, to: 5 })).rejects.toThrow();
  });

  it("rejects a half-sentinel span", async () => {
    await expect(record({ from: 0, to: 5 })).rejects.toThrow();
  });

  it("accepts a single-verse span", async () => {
    await expect(record({ from: 7, to: 7 })).resolves.toBeUndefined();
  });

  it("rejects more than 10 chapters a day", async () => {
    await expect(
      replaceActiveReadingPlan(
        user,
        makeDraft({ startDate: "2026-08-09", chaptersPerDay: 11 }),
      ),
    ).rejects.toThrow();
    // The failed change rolled back: the original plan is still the open one.
    expect((await getActiveReadingPlan(user))?.id).toBe(plan.id);
  });

  it("rejects an active plan that has an end date", async () => {
    await expect(
      db.readingPlan.update({
        where: { id: plan.id },
        data: { endDate: new Date("2026-08-08T00:00:00Z") },
      }),
    ).rejects.toThrow();
  });
});

describe("getReadingSnapshot", () => {
  it("returns plans, the active plan and completions together", async () => {
    const first = await createReadingPlan(user, makeDraft());
    await markReadingComplete(user, {
      readingPlanId: first.id,
      localDate: "2026-07-21",
      chapters: [{ bookId: "GEN", chapter: 2 }],
    });
    const second = await replacePlan(
      user,
      makeDraft({ startDate: "2026-08-09" }),
    );

    const snapshot = await getReadingSnapshot(user);
    expect(snapshot.plans.map((plan) => plan.id)).toEqual([
      first.id,
      second.id,
    ]);
    expect(snapshot.activePlan?.id).toBe(second.id);
    expect(snapshot.completions).toEqual([
      expect.objectContaining({
        localDate: "2026-07-21",
        chapter: 2,
        readingPlanId: first.id,
      }),
    ]);
  });
});
