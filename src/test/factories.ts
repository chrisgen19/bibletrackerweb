import type { ReadingPlanDraft } from "@/features/reading-plan/domain/types";
import { db } from "@/lib/db";
import { createId } from "@/utils/id";

/**
 * A fresh reader for one test. Every row is scoped to a user, so giving each test its
 * own keeps tests independent without clearing tables between them.
 *
 * Writes the user directly: in the app, Better Auth creates users (Phase 3).
 */
export async function createTestUser(): Promise<string> {
  const id = createId();
  await db.user.create({
    data: { id, name: "Test Reader", email: `${id}@example.test` },
  });
  return id;
}

export function makeDraft(
  overrides: Partial<ReadingPlanDraft> = {},
): ReadingPlanDraft {
  return {
    canonId: "protestant",
    startDate: "2026-07-20",
    startBookId: "GEN",
    startChapter: 1,
    chaptersPerDay: 1,
    ...overrides,
  };
}
