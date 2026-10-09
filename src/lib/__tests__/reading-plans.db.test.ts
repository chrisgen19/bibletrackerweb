// Ported from bibletrackerapp src/features/reading-plan/data/__tests__/
// reading-plan-repository.test.ts. Same cases and names, plus one case of the web's own (marked).
// Each test gets its own reader instead of a fresh in-memory SQLite database.
import { beforeEach, describe, expect, it } from "vitest";

import { resolvePlanForDate } from "@/features/reading-plan/domain/schedule";
import {
  createReadingPlan,
  getActiveReadingPlan,
  getAllCompletions,
  getAllReadingPlans,
  markReadingComplete,
  replaceActiveReadingPlan,
  resetAllProgress,
} from "@/lib/dal";
import {
  createTestUser,
  makeDraft as draft,
  replacePlan,
} from "@/test/factories";

let user: string;

beforeEach(async () => {
  user = await createTestUser();
});

describe("createReadingPlan", () => {
  it("stores the draft as the active, open-ended segment", async () => {
    const plan = await createReadingPlan(user, draft());

    expect(plan.isActive).toBe(true);
    expect(plan.endDate).toBeNull();
    expect(await getActiveReadingPlan(user)).toMatchObject({
      id: plan.id,
      startDate: "2026-07-20",
      startBookId: "GEN",
      startChapter: 1,
    });
  });

  it("returns null when no plan exists", async () => {
    expect(await getActiveReadingPlan(user)).toBeNull();
  });
});

describe("replaceActiveReadingPlan", () => {
  it("closes the outgoing segment the day before the new one starts", async () => {
    const first = await createReadingPlan(
      user,
      draft({ startDate: "2026-07-20" }),
    );
    const second = await replacePlan(
      user,
      draft({ startDate: "2026-08-09", startBookId: "MAT" }),
    );

    const plans = await getAllReadingPlans(user);
    expect(plans).toHaveLength(2);

    const closed = plans.find((p) => p.id === first.id);
    expect(closed?.isActive).toBe(false);
    // The old segment governs right up to, but not including, the new start.
    expect(closed?.endDate).toBe("2026-08-08");

    expect(second.isActive).toBe(true);
    expect(second.endDate).toBeNull();
    expect((await getActiveReadingPlan(user))?.id).toBe(second.id);
  });

  it("writes nothing when there is no open segment to replace", async () => {
    // Another device reset progress: the change must not start a plan of its own.
    expect(
      await replaceActiveReadingPlan(user, draft({ startDate: "2026-08-09" })),
    ).toBeNull();
    expect(await getAllReadingPlans(user)).toEqual([]);
  });

  it("leaves exactly one active segment", async () => {
    await createReadingPlan(user, draft());
    await replaceActiveReadingPlan(user, draft({ startDate: "2026-08-01" }));
    await replaceActiveReadingPlan(user, draft({ startDate: "2026-08-09" }));

    expect(
      (await getAllReadingPlans(user)).filter((p) => p.isActive),
    ).toHaveLength(1);
  });

  it("never modifies completions", async () => {
    const first = await createReadingPlan(
      user,
      draft({ startDate: "2026-07-20" }),
    );
    await markReadingComplete(user, {
      readingPlanId: first.id,
      localDate: "2026-07-21",
      chapters: [{ bookId: "GEN", chapter: 2 }],
      completedAt: 111,
    });

    const before = await getAllCompletions(user);
    await replaceActiveReadingPlan(
      user,
      draft({ startDate: "2026-08-09", startBookId: "MAT" }),
    );

    // This is the guarantee the whole plan-segment design exists to provide.
    expect(await getAllCompletions(user)).toEqual(before);
  });

  it("supersedes a same-day segment without matching any date", async () => {
    const first = await createReadingPlan(
      user,
      draft({ startDate: "2026-08-09" }),
    );
    await replaceActiveReadingPlan(
      user,
      draft({ startDate: "2026-08-09", startBookId: "MAT" }),
    );

    const closed = (await getAllReadingPlans(user)).find(
      (p) => p.id === first.id,
    );
    // endDate before startDate: the segment governs no day at all, by design.
    expect(closed?.endDate).toBe("2026-08-08");
    expect(closed?.startDate).toBe("2026-08-09");
  });

  // The web's own case. Not a port, and pinned because "start before the active plan's
  // start" looks like an error and was flagged as one in review (#5).
  it("supersedes a plan that has not started yet", async () => {
    // Onboarded with a start date of Sep 1, then moved position on Aug 24: the
    // reading-plan screen always starts the new segment today. Rejecting it would
    // stop the reader changing position until the original start date arrived.
    const future = await createReadingPlan(
      user,
      draft({ startDate: "2026-09-01" }),
    );
    const now = await replacePlan(
      user,
      draft({ startDate: "2026-08-24", startBookId: "MAT" }),
    );

    const plans = await getAllReadingPlans(user);
    // Like the same-day case, the plan that never began governs no day at all.
    expect(plans.find((p) => p.id === future.id)).toMatchObject({
      isActive: false,
      startDate: "2026-09-01",
      endDate: "2026-08-23",
    });
    for (const day of ["2026-08-24", "2026-09-01", "2026-12-31"]) {
      expect(resolvePlanForDate(plans, day)?.id).toBe(now.id);
    }
    expect((await getActiveReadingPlan(user))?.id).toBe(now.id);
  });

  it("carries chapters per day onto the new segment", async () => {
    await createReadingPlan(user, draft());
    const next = await replacePlan(
      user,
      draft({ startDate: "2026-08-09", chaptersPerDay: 3 }),
    );
    expect(next.chaptersPerDay).toBe(3);
  });
});

describe("resetAllProgress", () => {
  it("removes plans and completions together", async () => {
    const plan = await createReadingPlan(user, draft());
    await markReadingComplete(user, {
      readingPlanId: plan.id,
      localDate: "2026-07-21",
      chapters: [{ bookId: "GEN", chapter: 2 }],
    });

    await resetAllProgress(user);

    expect(await getAllReadingPlans(user)).toHaveLength(0);
    expect(await getAllCompletions(user)).toHaveLength(0);
    expect(await getActiveReadingPlan(user)).toBeNull();
  });
});
