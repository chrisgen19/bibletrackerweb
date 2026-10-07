// Web-only (bibletrackerweb#18): extra readings in the DAL and commands. The iOS ports
// (completions.db.test.ts, commands.db.test.ts) are left as they are.
import { beforeEach, describe, expect, it } from "vitest";

import {
  completeReadingFor,
  setReadingExtraFor,
  undoReadingFor,
} from "@/features/reading-plan/commands/commands";
import type { ReadingResult } from "@/features/reading-plan/commands/results";
import type { ReadingPlan } from "@/features/reading-plan/domain/types";
import {
  createReadingPlan,
  getAllCompletions,
  markReadingComplete,
  removeReadingCompletion,
  setReadingExtra,
} from "@/lib/dal";
import { createTestUser, makeDraft } from "@/test/factories";
import { createId } from "@/utils/id";

const TZ = "Asia/Manila";

let user: string;
let plan: ReadingPlan;

beforeEach(async () => {
  user = await createTestUser();
  plan = await createReadingPlan(user, makeDraft());
});

function log(
  localDate: string,
  chapter: number,
  options: { isExtra?: boolean; bookId?: string } = {},
) {
  const id = createId();
  return markReadingComplete(user, {
    readingPlanId: plan.id,
    localDate,
    chapters: [{ bookId: options.bookId ?? "GEN", chapter }],
    ids: [id],
    isExtra: options.isExtra,
  }).then(() => id);
}

function snapshotOf(result: ReadingResult) {
  if (!result.ok) throw new Error(`Expected success, got ${result.error}`);
  return result.snapshot;
}

describe("markReadingComplete and extra readings", () => {
  it("records a plan reading unless told otherwise", async () => {
    await log("2026-08-01", 1);
    expect(await getAllCompletions(user)).toEqual([
      expect.objectContaining({ chapter: 1, isExtra: false }),
    ]);
  });

  it("records an extra reading", async () => {
    await log("2026-08-01", 5, { bookId: "REV", isExtra: true });
    expect(await getAllCompletions(user)).toEqual([
      expect.objectContaining({ bookId: "REV", chapter: 5, isExtra: true }),
    ]);
  });

  it("brings a matching extra into the plan instead of skipping it", async () => {
    const id = await log("2026-08-01", 1, { isExtra: true });

    await log("2026-08-01", 1);

    expect(await getAllCompletions(user)).toEqual([
      expect.objectContaining({ id, chapter: 1, isExtra: false }),
    ]);
  });

  it("leaves the same chapter on another day as an extra", async () => {
    await log("2026-08-01", 1, { isExtra: true });

    await log("2026-08-02", 1);

    expect(
      (await getAllCompletions(user)).map((row) => [
        row.localDate,
        row.isExtra,
      ]),
    ).toEqual([
      ["2026-08-01", true],
      ["2026-08-02", false],
    ]);
  });

  it("never demotes a plan reading when the same chapter is logged as extra", async () => {
    const id = await log("2026-08-01", 1);

    await log("2026-08-01", 1, { isExtra: true });

    expect(await getAllCompletions(user)).toEqual([
      expect.objectContaining({ id, isExtra: false }),
    ]);
  });
});

describe("setReadingExtra", () => {
  it("moves a reading out of the plan and back", async () => {
    const id = await log("2026-08-01", 1);

    await setReadingExtra(user, id, true);
    expect((await getAllCompletions(user))[0]?.isExtra).toBe(true);

    await setReadingExtra(user, id, false);
    expect((await getAllCompletions(user))[0]?.isExtra).toBe(false);
  });

  it("only touches the reader's own rows", async () => {
    const id = await log("2026-08-01", 1);
    const stranger = await createTestUser();

    await setReadingExtra(stranger, id, true);

    expect((await getAllCompletions(user))[0]?.isExtra).toBe(false);
  });

  it("ignores an id that is not a UUID instead of failing", async () => {
    await expect(
      setReadingExtra(user, "not-a-uuid", true),
    ).resolves.toBeUndefined();
  });
});

describe("removeReadingCompletion", () => {
  it("undoes the day's plan reading and leaves its extras", async () => {
    await log("2026-08-01", 1);
    await log("2026-08-01", 5, { bookId: "REV", isExtra: true });

    await removeReadingCompletion(user, "2026-08-01");

    expect(await getAllCompletions(user)).toEqual([
      expect.objectContaining({ bookId: "REV", chapter: 5, isExtra: true }),
    ]);
  });
});

describe("reading commands", () => {
  it("completeReadingFor stores the extra flag", async () => {
    const snapshot = snapshotOf(
      await completeReadingFor(user, {
        date: "2026-08-01",
        chapters: [{ bookId: "REV", chapter: 5 }],
        isExtra: true,
        timeZone: TZ,
      }),
    );
    expect(snapshot.completions).toEqual([
      expect.objectContaining({ bookId: "REV", isExtra: true }),
    ]);
  });

  it("setReadingExtraFor returns the updated snapshot", async () => {
    const id = await log("2026-08-01", 1);
    const snapshot = snapshotOf(
      await setReadingExtraFor(user, { id, isExtra: true }),
    );
    expect(snapshot.completions[0]?.isExtra).toBe(true);
  });

  it("setReadingExtraFor refuses malformed input", async () => {
    expect(await setReadingExtraFor(user, { id: "x" })).toEqual({
      ok: false,
      error: "invalid-input",
    });
  });

  it("undoReadingFor keeps the day's extras", async () => {
    await log("2026-08-01", 1);
    await log("2026-08-01", 5, { bookId: "REV", isExtra: true });

    const snapshot = snapshotOf(
      await undoReadingFor(user, { date: "2026-08-01" }),
    );

    expect(snapshot.completions.map((row) => row.bookId)).toEqual(["REV"]);
  });
});
