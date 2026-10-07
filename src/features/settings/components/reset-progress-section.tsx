"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SectionHeader } from "@/components/section-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DEFAULT_CANON_ID, getCanonIndex } from "@/data/bible/canon-index";
import { countChaptersRead } from "@/features/reading-plan/domain/chapter-progress";
import { useReadingData } from "@/features/reading-plan/hooks/reading-data-provider";
import { useWritesSettled } from "@/features/reading-plan/hooks/use-writes-settled";
import {
  describeResetImpact,
  RESET_PROGRESS,
} from "@/features/reading-plan/reset-progress";

/** Reset Progress, behind a confirmation with the iOS alert's title and button order. */
export function ResetProgressSection() {
  const router = useRouter();
  const { resetProgress, completions, activePlan, hasCompletedOnboarding } =
    useReadingData();
  // Chapters, as the progress screen counts them: not rows, of which a chapter read in two
  // sittings has two and a half-read one has one.
  const chaptersRead = countChaptersRead(
    completions,
    getCanonIndex(activePlan?.canonId ?? DEFAULT_CANON_ID),
  );
  const settled = useWritesSettled();
  const [resetting, setResetting] = useState(false);

  // To onboarding once the server has it, so it does not find the old plan and send us
  // straight back.
  useEffect(() => {
    if (!resetting || !settled) return;
    if (!hasCompletedOnboarding) router.replace("/onboarding");
    else setResetting(false); // Refused: WriteStatus says why.
  }, [resetting, settled, hasCompletedOnboarding, router]);

  return (
    <section aria-labelledby="reset-heading">
      <SectionHeader id="reset-heading" title="Reset Progress" />
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            size="large"
            className="w-full"
            disabled={resetting}
          >
            Reset Progress
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{RESET_PROGRESS.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {RESET_PROGRESS.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{RESET_PROGRESS.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setResetting(true);
                resetProgress();
              }}
            >
              {RESET_PROGRESS.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <p className="mt-2 text-footnote text-faint">
        {describeResetImpact(chaptersRead)}
      </p>
    </section>
  );
}
