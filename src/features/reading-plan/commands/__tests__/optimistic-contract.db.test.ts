// Contract: the optimistic snapshot the browser shows must match what the server stores.
// The same writes run through the real commands (Postgres) and through optimistic.ts,
// and the two snapshots are compared. Plan ids and timestamps are assigned by different
// sides, so they are mapped and ignored; completion ids are chosen by the client and must
// match exactly.
import { describe, expect, it } from "vitest";

import { buildNextReadThroughDraft } from "@/features/reading-plan/domain/read-through";
import type { ReadingPlanDraft } from "@/features/reading-plan/domain/types";
import type { ReadingSnapshot } from "@/lib/dal";
import { createTestUser, makeDraft } from "@/test/factories";
import { createId } from "@/utils/id";
import { getTodayDateKeyInZone } from "@/utils/zoned-date-key";

import {
  changePlanFor,
  completeReadingFor,
  setReadingExtraFor,
  startNextReadThroughFor,
  startPlanFor,
  undoReadingEntryFor,
  undoReadingFor,
} from "../commands";
import {
  withChangedPlan,
  withCompletedReading,
  withNextReadThrough,
  withoutDay,
  withoutEntry,
  withReadingExtra,
  withStartedPlan,
} from "../optimistic";
import type { ReadingResult } from "../results";

const TZ = "UTC";

type Step =
  | { kind: "start"; draft: ReadingPlanDraft }
  | { kind: "change"; draft: ReadingPlanDraft }
  | {
      kind: "complete";
      date: string;
      chapters: { bookId: string; chapter: number }[];
      verses?: { from: number; to: number };
      isExtra?: boolean;
    }
  | { kind: "undo-day"; date: string }
  | { kind: "undo-entry"; nth: number }
  | { kind: "set-extra"; nth: number; isExtra: boolean }
  | { kind: "next-read-through" };

/** Strips server-assigned values: plan ids become their position, timestamps go. */
function comparable(snapshot: ReadingSnapshot) {
  const planIndex = new Map(
    snapshot.plans.map((plan, index) => [plan.id, index]),
  );
  return {
    plans: snapshot.plans.map(({ id: _id, createdAt: _c, ...plan }) => plan),
    activePlan:
      snapshot.activePlan === null
        ? null
        : planIndex.get(snapshot.activePlan.id),
    completions: snapshot.completions.map(
      ({ completedAt: _c, readingPlanId, ...row }) => ({
        ...row,
        plan: planIndex.get(readingPlanId),
      }),
    ),
  };
}

async function runBoth(steps: Step[]) {
  const user = await createTestUser();
  let server: ReadingSnapshot = {
    plans: [],
    activePlan: null,
    completions: [],
  };
  let client: ReadingSnapshot = server;
  const ids: string[] = [];
  let clock = 0;

  const take = (result: ReadingResult) => {
    if (!result.ok) throw new Error(`Server refused a step: ${result.error}`);
    return result.snapshot;
  };

  for (const step of steps) {
    clock += 1;
    switch (step.kind) {
      case "start":
        server = take(await startPlanFor(user, { draft: step.draft }));
        client = withStartedPlan(client, step.draft, {
          id: `p${clock}`,
          createdAt: clock,
        });
        break;
      case "change":
        server = take(
          await changePlanFor(user, { draft: step.draft, timeZone: TZ }),
        );
        client = withChangedPlan(client, step.draft, {
          id: `p${clock}`,
          createdAt: clock,
        });
        break;
      case "complete": {
        const rowIds = step.chapters.map(() => createId());
        ids.push(...rowIds);
        server = take(
          await completeReadingFor(user, {
            ...step,
            ids: rowIds,
            timeZone: TZ,
          }),
        );
        client = withCompletedReading(client, {
          ...step,
          ids: rowIds,
          completedAt: clock,
        });
        break;
      }
      case "undo-day":
        server = take(await undoReadingFor(user, { date: step.date }));
        client = withoutDay(client, step.date);
        break;
      case "undo-entry": {
        const id = ids[step.nth] ?? "";
        server = take(await undoReadingEntryFor(user, { id }));
        client = withoutEntry(client, id);
        break;
      }
      case "next-read-through": {
        const active = client.activePlan;
        if (active === null) throw new Error("No plan to carry on from");
        server = take(await startNextReadThroughFor(user, { timeZone: TZ }));
        client = withNextReadThrough(
          client,
          buildNextReadThroughDraft(active, getTodayDateKeyInZone(TZ)),
          { id: `p${clock}`, createdAt: clock },
        );
        break;
      }
      case "set-extra": {
        const id = ids[step.nth] ?? "";
        server = take(
          await setReadingExtraFor(user, { id, isExtra: step.isExtra }),
        );
        client = withReadingExtra(client, id, step.isExtra);
        break;
      }
    }
    // Compared after every step, not just at the end.
    expect(comparable(client), `after step ${clock} (${step.kind})`).toEqual(
      comparable(server),
    );
  }
}

describe("optimistic snapshots match the server", () => {
  const today = getTodayDateKeyInZone(TZ);

  it("through a realistic run of reading, catching up, moving and undoing", async () => {
    await runBoth([
      { kind: "start", draft: makeDraft({ startDate: "2026-01-01" }) },
      {
        kind: "complete",
        date: "2026-01-01",
        chapters: [{ bookId: "GEN", chapter: 1 }],
      },
      // Multi-chapter day: the span is ignored for both.
      {
        kind: "complete",
        date: "2026-01-02",
        chapters: [
          { bookId: "GEN", chapter: 2 },
          { bookId: "GEN", chapter: 3 },
        ],
        verses: { from: 1, to: 5 },
      },
      // Same chapter again on the same day: a no-op on both sides.
      {
        kind: "complete",
        date: "2026-01-02",
        chapters: [{ bookId: "GEN", chapter: 2 }],
      },
      // A chapter finished across two sittings on one day: two rows.
      {
        kind: "complete",
        date: "2026-01-03",
        chapters: [{ bookId: "GEN", chapter: 4 }],
        verses: { from: 1, to: 10 },
      },
      {
        kind: "complete",
        date: "2026-01-03",
        chapters: [{ bookId: "GEN", chapter: 4 }],
        verses: { from: 11, to: 26 },
      },
      // Catch-up on an earlier day sorts before later days.
      {
        kind: "complete",
        date: "2025-12-31",
        chapters: [{ bookId: "PSA", chapter: 23 }],
      },
      {
        kind: "change",
        draft: makeDraft({ startDate: today, startBookId: "MAT" }),
      },
      // Governed by the closed segment.
      {
        kind: "complete",
        date: "2026-01-05",
        chapters: [{ bookId: "GEN", chapter: 5 }],
      },
      {
        kind: "complete",
        date: today,
        chapters: [{ bookId: "MAT", chapter: 1 }],
      },
      { kind: "undo-entry", nth: 1 },
      { kind: "undo-day", date: "2026-01-03" },
    ]);
  });

  // Web-only (bibletrackerweb#18).
  it("through extra readings: logged, switched, and kept when the day is undone", async () => {
    await runBoth([
      { kind: "start", draft: makeDraft({ startDate: "2026-01-01" }) },
      {
        kind: "complete",
        date: "2026-01-01",
        chapters: [{ bookId: "GEN", chapter: 1 }],
      },
      {
        kind: "complete",
        date: "2026-01-01",
        chapters: [{ bookId: "REV", chapter: 5 }],
        isExtra: true,
      },
      {
        kind: "complete",
        date: "2026-01-02",
        chapters: [{ bookId: "NUM", chapter: 6 }],
        verses: { from: 24, to: 26 },
        isExtra: true,
      },
      { kind: "set-extra", nth: 0, isExtra: true },
      { kind: "set-extra", nth: 0, isExtra: false },
      { kind: "set-extra", nth: 2, isExtra: false },
      // Undoing the day removes its plan reading and leaves the extra.
      { kind: "undo-day", date: "2026-01-01" },
      { kind: "undo-entry", nth: 1 },
    ]);
  });

  // Web-only (bibletrackerweb#18).
  it("through a finished Bible and the next read-through", async () => {
    await runBoth([
      {
        kind: "start",
        draft: makeDraft({
          startDate: "2026-01-01",
          startBookId: "REV",
          startChapter: 22,
        }),
      },
      {
        kind: "complete",
        date: "2026-01-01",
        chapters: [{ bookId: "REV", chapter: 22 }],
      },
      { kind: "next-read-through" },
      {
        kind: "complete",
        date: today,
        chapters: [{ bookId: "GEN", chapter: 1 }],
      },
      // A position change stays in read-through 2.
      {
        kind: "change",
        draft: makeDraft({ startDate: today, startBookId: "PSA" }),
      },
    ]);
  });

  it("through a same-day position change", async () => {
    await runBoth([
      { kind: "start", draft: makeDraft({ startDate: today }) },
      {
        kind: "complete",
        date: today,
        chapters: [{ bookId: "GEN", chapter: 1 }],
      },
      {
        kind: "change",
        draft: makeDraft({ startDate: today, startBookId: "JHN" }),
      },
      {
        kind: "complete",
        date: today,
        chapters: [{ bookId: "JHN", chapter: 1 }],
      },
    ]);
  });
});
