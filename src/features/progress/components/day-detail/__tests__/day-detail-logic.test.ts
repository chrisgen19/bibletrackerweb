// Web additions to the ported day-detail tests, on the extracted decisions directly.
import type { ChapterProgress } from "@/features/reading-plan/domain/chapter-progress";

import { verseSelection } from "../day-detail-logic";

/** Genesis 21 (34 verses), with 1-10 already read. */
const progress: ChapterProgress = {
  reference: { bookId: "GEN", chapter: 21 },
  verseCount: 34,
  read: [{ from: 1, to: 10 }],
  remaining: [{ from: 11, to: 34 }],
  isComplete: false,
  isPartial: true,
};

describe("verseSelection", () => {
  it("starts from the first unread verse and defaults to the end of the chapter", () => {
    expect(verseSelection(progress, null)).toMatchObject({
      span: { from: 11, to: 34 },
      finishesChapter: true,
    });
  });

  it("ignores a stale choice below the first unread verse rather than reversing the span", () => {
    // The verse control also clears its choice after each save, so the ported iOS test
    // never reaches this guard; it is the second line of defence, tested on its own.
    expect(verseSelection(progress, 10).span).toEqual({ from: 11, to: 34 });
  });

  it("records up to a later choice", () => {
    expect(verseSelection(progress, 20)).toMatchObject({
      span: { from: 11, to: 20 },
      finishesChapter: false,
    });
  });
});
