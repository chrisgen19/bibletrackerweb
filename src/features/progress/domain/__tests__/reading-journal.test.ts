import { PROTESTANT_CANON_INDEX } from "@/data/bible/canon-index";
import {
  makeCompletion,
  makePlan,
} from "@/features/reading-plan/domain/__tests__/fixtures";
import {
  createCompletionLookup,
  createScheduleContext,
} from "@/features/reading-plan/domain/schedule";
import type { ReadingCompletion } from "@/features/reading-plan/domain/types";
import type { DateKey } from "@/utils/date-key";

import {
  buildReadingJournal,
  countChaptersFinished,
  describePassages,
  describeRecentReading,
  describeWeek,
  startOfWeekKey,
  summariseRecentReading,
} from "../reading-journal";

// Thursday. Its week runs from Sunday 25 October.
const TODAY: DateKey = "2026-10-29";
const PLAN = makePlan({ startDate: "2026-10-01" });
const index = PROTESTANT_CANON_INDEX;
// The en dash the reference formatter joins a span with.
const SPAN = String.fromCharCode(0x2013);

function journalFor(rows: readonly ReadingCompletion[], today = TODAY) {
  const input = {
    plans: [PLAN],
    completions: createCompletionLookup(rows),
    context: createScheduleContext([PLAN], rows, today),
    today,
    index,
  };
  return {
    weeks: buildReadingJournal({
      ...input,
      firstDate: PLAN.startDate,
      weeks: 2,
    }),
    recent: summariseRecentReading({ ...input, rows }),
  };
}

function read(date: DateKey, chapter: number, extra = false) {
  return makeCompletion(date, {
    id: `${date}-${chapter}`,
    chapter,
    isExtra: extra,
  });
}

describe("weeks", () => {
  it("start on Sunday, as the calendar grid does", () => {
    expect(startOfWeekKey(TODAY)).toBe("2026-10-25");
    expect(startOfWeekKey("2026-10-25")).toBe("2026-10-25");
  });

  it("are named from the reader's point of view", () => {
    expect(describeWeek("2026-10-25", TODAY)).toBe("This week");
    expect(describeWeek("2026-10-18", TODAY)).toBe("Last week");
    expect(describeWeek("2026-10-11", TODAY)).toBe("Week of 11 Oct");
    expect(describeWeek("2025-12-28", TODAY)).toBe("Week of 28 Dec 2025");
  });
});

describe("describePassages", () => {
  it("joins consecutive chapters and keeps separate books apart", () => {
    const rows = [
      read(TODAY, 3),
      read(TODAY, 1),
      read(TODAY, 2),
      makeCompletion(TODAY, { bookId: "PSA", chapter: 23 }),
    ];
    expect(describePassages(rows, index)).toBe(`Genesis 1${SPAN}3, Psalms 23`);
  });

  it("names the verses of a chapter read only in part", () => {
    const rows = [makeCompletion(TODAY, { verses: { from: 1, to: 10 } })];
    expect(describePassages(rows, index)).toBe(`Genesis 1:1${SPAN}10`);
  });
});

describe("buildReadingJournal", () => {
  it("threads consecutive read days and folds unread ones into a quiet line", () => {
    const { weeks } = journalFor([
      read("2026-10-29", 5),
      read("2026-10-28", 4),
      read("2026-10-25", 3),
      read("2026-10-24", 2),
    ]);
    const [thisWeek, lastWeek] = weeks;

    expect(thisWeek?.label).toBe("This week");
    expect(thisWeek?.entries).toEqual([
      expect.objectContaining({
        date: "2026-10-29",
        above: "none",
        below: "chain",
      }),
      expect.objectContaining({
        date: "2026-10-28",
        above: "chain",
        below: "none",
      }),
      { kind: "quiet", newest: "2026-10-27", oldest: "2026-10-26", days: 2 },
      expect.objectContaining({
        date: "2026-10-25",
        above: "none",
        below: "chain",
      }),
    ]);
    // Saturday 24 and Sunday 25 were both read, so the chain runs through the heading.
    expect(lastWeek?.threaded).toBe("chain");
    expect(lastWeek?.entries[0]).toEqual(
      expect.objectContaining({ date: "2026-10-24", above: "chain" }),
    );
  });

  it("keeps an unread today open rather than counting it missed", () => {
    const { weeks } = journalFor([read("2026-10-28", 1)]);

    expect(weeks[0]?.entries[0]).toEqual({
      kind: "today",
      date: TODAY,
      next: "Genesis 2",
      below: "open",
    });
    expect(weeks[0]?.entries[1]).toEqual(
      expect.objectContaining({ kind: "read", above: "open" }),
    );
  });

  it("lists extra readings beside the plan's", () => {
    const { weeks } = journalFor([
      read(TODAY, 1),
      makeCompletion(TODAY, {
        id: "extra",
        bookId: "PSA",
        chapter: 23,
        isExtra: true,
      }),
    ]);

    expect(weeks[0]?.entries[0]).toEqual(
      expect.objectContaining({ passage: "Genesis 1", extras: "Psalms 23" }),
    );
  });

  it("stops at the plan's first day", () => {
    const { weeks } = journalFor([], "2026-10-02");

    expect(weeks).toHaveLength(1);
    expect(weeks[0]?.entries).toEqual([
      expect.objectContaining({ kind: "today" }),
      { kind: "quiet", newest: "2026-10-01", oldest: "2026-10-01", days: 1 },
    ]);
  });
});

describe("recent reading", () => {
  it("counts the last seven days and the chapters finished this month", () => {
    const { recent } = journalFor([
      read("2026-10-29", 5),
      read("2026-10-28", 4),
      read("2026-10-25", 3),
      read("2026-10-24", 2),
      read("2026-10-02", 1),
      makeCompletion("2026-10-27", { chapter: 6, verses: { from: 1, to: 5 } }),
    ]);

    expect(recent).toEqual({
      readDays: 5,
      windowDays: 7,
      chaptersThisMonth: 5,
    });
    expect(describeRecentReading(recent)).toBe(
      "5 of the last 7 days. 5 chapters this month.",
    );
  });

  it("does not count an unread today against the week", () => {
    const { recent } = journalFor([read("2026-10-28", 1)]);

    // The window ends yesterday: 22 to 28 October.
    expect(recent.readDays).toBe(1);
    expect(recent.windowDays).toBe(7);
  });

  it("counts a chapter in the month its last verses were read", () => {
    const rows = [
      makeCompletion("2026-01-31", {
        id: "first-half",
        verses: { from: 1, to: 10 },
      }),
      makeCompletion("2026-02-01", {
        id: "second-half",
        verses: { from: 11, to: 31 },
      }),
    ];
    const finishedIn = (from: DateKey, to: DateKey) =>
      countChaptersFinished(rows, { from, to }, index);

    expect(finishedIn("2026-01-01", "2026-01-31")).toBe(0);
    expect(finishedIn("2026-02-01", "2026-02-01")).toBe(1);
  });

  it("counts a chapter read again in a later month", () => {
    const rows = [
      makeCompletion("2026-01-05", { id: "first-time" }),
      makeCompletion("2026-02-05", { id: "second-time" }),
    ];

    expect(
      countChaptersFinished(
        rows,
        { from: "2026-02-01", to: "2026-02-28" },
        index,
      ),
    ).toBe(1);
  });

  it("words a first week in the third person for a friend", () => {
    const recent = { readDays: 2, windowDays: 3, chaptersThisMonth: 0 };

    expect(describeRecentReading(recent)).toBe("2 of 3 days since you began.");
    expect(describeRecentReading(recent, "self")).toBe(
      "2 of 3 days since you began.",
    );
    expect(describeRecentReading(recent, "friend")).toBe(
      "2 of 3 days since starting.",
    );
    expect(
      describeRecentReading(
        { readDays: 1, windowDays: 1, chaptersThisMonth: 0 },
        "friend",
      ),
    ).toBe("1 of 1 day since starting.");
  });

  it("says nothing about a week without reading", () => {
    expect(
      describeRecentReading({
        readDays: 0,
        windowDays: 7,
        chaptersThisMonth: 0,
      }),
    ).toBeNull();
  });
});
