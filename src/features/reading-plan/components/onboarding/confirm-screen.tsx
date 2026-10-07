"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { validateReadingPlanDraft } from "@/features/reading-plan/domain/plan-draft";
import { formatReference } from "@/features/reading-plan/domain/reference";
import { useOnboarding } from "@/features/reading-plan/hooks/onboarding-context";
import { useReadingData } from "@/features/reading-plan/hooks/reading-data-provider";
import { useWritesSettled } from "@/features/reading-plan/hooks/use-writes-settled";
import { fromDateKey } from "@/utils/date-key";

import { StepShell } from "./step-shell";

export function ConfirmScreen() {
  const router = useRouter();
  const { draft } = useOnboarding();
  const { startPlan, today, hasCompletedOnboarding } = useReadingData();
  const settled = useWritesSettled();
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const startDay = fromDateKey(draft.startDate);
  const startsToday = draft.startDate === today;
  const reference = formatReference({
    bookId: draft.startBookId,
    chapter: draft.startChapter,
  });

  // Home only once the server has the plan: going on the optimistic one alone reaches a
  // server render that has not seen it yet, which sends the reader straight back here.
  useEffect(() => {
    if (!starting || !settled) return;
    if (hasCompletedOnboarding) router.replace("/");
    else setStarting(false); // Refused: WriteStatus says why, and the button is back.
  }, [starting, settled, hasCompletedOnboarding, router]);

  function handleStart() {
    const validation = validateReadingPlanDraft(draft);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    setError(null);
    setStarting(true);
    startPlan(draft);
  }

  return (
    <StepShell title="Your first reading">
      <Panel variant="raised" className="mt-6 py-7 text-center">
        <p className="text-overline text-faint">
          {startsToday
            ? "TODAY"
            : format(startDay, "d MMMM yyyy").toUpperCase()}
        </p>
        <p className="mt-3 text-display">{reference}</p>
        <p className="mt-1 text-callout text-muted-foreground">
          One chapter a day
        </p>
      </Panel>
      <p className="mt-4 text-center text-footnote text-faint">
        {startsToday
          ? "Each following day moves to the next chapter automatically."
          : `Your plan begins on ${format(startDay, "EEEE d MMMM")} and moves forward one chapter a day.`}
      </p>
      {error === null ? null : (
        <p
          role="alert"
          className="mt-3 text-center text-footnote text-destructive"
        >
          {error}
        </p>
      )}
      <Button
        size="large"
        className="mt-8 w-full"
        onClick={handleStart}
        disabled={starting}
      >
        Start Reading
      </Button>
    </StepShell>
  );
}
