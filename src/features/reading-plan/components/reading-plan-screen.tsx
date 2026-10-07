"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Panel } from "@/components/panel";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { DEFAULT_CANON_ID } from "@/data/bible/canon-index";
import {
  DEFAULT_CHAPTERS_PER_DAY,
  validateReadingPlanDraft,
} from "@/features/reading-plan/domain/plan-draft";
import { formatReference } from "@/features/reading-plan/domain/reference";
import { calculateReadingForDate } from "@/features/reading-plan/domain/schedule";
import type { ReadingPlanDraft } from "@/features/reading-plan/domain/types";
import { useReadingData } from "@/features/reading-plan/hooks/reading-data-provider";

import { ReadingPositionFields } from "./reading-position-fields";

/**
 * Moves the reader's position (bibletrackerapp's reading-plan screen).
 *
 * The new position always begins today as a fresh plan segment; earlier days keep
 * resolving against the segment that governed them, so no completed day changes.
 */
export function ReadingPlanScreen() {
  const router = useRouter();
  // The plan's view: a day holding only an extra reading still reads as its plan chapter.
  const {
    activePlan,
    today,
    changePlan,
    planScheduleContext: scheduleContext,
  } = useReadingData();
  const reading =
    activePlan === null
      ? null
      : calculateReadingForDate(activePlan, today, scheduleContext);
  const currentReference =
    reading?.kind === "scheduled" && reading.chapters[0] !== undefined
      ? formatReference(reading.chapters[0])
      : null;

  // Opens on where the reader is, the value Settings shows for "Current position", not on
  // the plan segment's first chapter.
  const [position, setPosition] = useState(() => {
    const here = scheduleContext.unread[0];
    return {
      bookId: here?.bookId ?? activePlan?.startBookId ?? "GEN",
      chapter: here?.chapter ?? activePlan?.startChapter ?? 1,
      startDate: today,
    };
  });
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    const draft: ReadingPlanDraft = {
      canonId: activePlan?.canonId ?? DEFAULT_CANON_ID,
      startDate: today,
      startBookId: position.bookId,
      startChapter: position.chapter,
      chaptersPerDay: activePlan?.chaptersPerDay ?? DEFAULT_CHAPTERS_PER_DAY,
    };
    const validation = validateReadingPlanDraft(draft);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    changePlan(draft);
    router.back();
  }

  return (
    <main className="mx-auto w-full max-w-lg px-5 pt-4 pb-24">
      <ScreenHeader
        title="Reading Plan"
        backHref="/settings"
        backLabel="Settings"
      />
      {currentReference === null ? null : (
        <Panel className="mb-5">
          <p className="text-overline text-faint">READING TODAY</p>
          <p className="mt-1 text-title">{currentReference}</p>
        </Panel>
      )}

      <h2 className="text-headline">Move to a different chapter</h2>
      <p className="mt-1 mb-4 text-footnote text-muted-foreground">
        The chapter you pick becomes today&apos;s reading, and the plan
        continues from there.
      </p>
      <ReadingPositionFields
        canonId={activePlan?.canonId ?? DEFAULT_CANON_ID}
        value={position}
        onChange={setPosition}
      />
      <p className="mt-5 rounded-xl bg-muted p-4 text-footnote text-muted-foreground">
        Your history is safe. Days you have already marked as read keep the
        chapter you read on them, and your streak carries over.
      </p>
      {error === null ? null : (
        <p role="alert" className="mt-3 text-footnote text-destructive">
          {error}
        </p>
      )}
      <Button size="large" className="mt-5 w-full" onClick={handleSave}>
        Save Position
      </Button>
    </main>
  );
}
