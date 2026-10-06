"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { DEFAULT_CANON_ID, getCanonIndex } from "@/data/bible/canon-index";
import { useStreaks } from "@/features/progress/hooks/use-streaks";
import { countChaptersRead } from "@/features/reading-plan/domain/chapter-progress";
import { buildReadingPlanDraft } from "@/features/reading-plan/domain/plan-draft";
import { formatReferenceSpan } from "@/features/reading-plan/domain/reference";
import { useReadingData } from "@/features/reading-plan/hooks/reading-data-provider";
import { useTodayReading } from "@/features/reading-plan/hooks/use-today-reading";

/**
 * Temporary home screen for Phase 4: proves the data path end to end (server render,
 * optimistic writes, Server Actions, the ported hooks) with the plainest possible UI.
 * Phase 5 replaces it with the real progress screen from the iOS app.
 */
export function TodayPanel() {
  const {
    hasCompletedOnboarding,
    today,
    completions,
    activePlan,
    startPlan,
    completeReading,
    undoReading,
    error,
    dismissError,
    isSaving,
  } = useReadingData();
  const day = useTodayReading();
  const streaks = useStreaks();
  const index = getCanonIndex(activePlan?.canonId ?? DEFAULT_CANON_ID);
  const chaptersRead = useMemo(
    () => countChaptersRead(completions, index),
    [completions, index],
  );

  return (
    <section className="grid w-full max-w-sm gap-4" aria-busy={isSaving}>
      {error === null ? null : (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          <span>{error}</span>
          <Button variant="ghost" size="xs" onClick={dismissError}>
            Dismiss
          </Button>
        </div>
      )}

      {!hasCompletedOnboarding ? (
        <div className="grid gap-3 rounded-lg border p-4">
          <p className="text-muted-foreground">
            You don&apos;t have a reading plan yet.
          </p>
          <Button
            onClick={() =>
              startPlan(buildReadingPlanDraft({ mode: "genesis", today }))
            }
          >
            Start at Genesis 1 today
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 rounded-lg border p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            TODAY&apos;S READING
          </p>
          <p className="text-2xl font-semibold" data-testid="today-reference">
            {day.scheduled.kind === "scheduled"
              ? formatReferenceSpan(day.scheduled.chapters)
              : day.scheduled.kind === "canon-complete"
                ? "You have finished the Bible"
                : "Nothing scheduled"}
          </p>
          {day.status === "completed" ? (
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">Completed today</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => undoReading(today)}
              >
                Undo
              </Button>
            </div>
          ) : day.scheduled.kind === "scheduled" ? (
            <Button
              onClick={() =>
                day.scheduled.kind === "scheduled" &&
                completeReading(today, day.scheduled.chapters)
              }
            >
              Mark as Read
            </Button>
          ) : null}
        </div>
      )}

      {/* Offline, a write waits for the connection instead of failing; say so. */}
      <p
        aria-live="polite"
        className="min-h-5 text-center text-sm text-muted-foreground"
        data-testid="saving"
      >
        {isSaving ? "Saving..." : ""}
      </p>

      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          ["day streak", streaks.current],
          ["longest streak", streaks.longest],
          ["chapters read", chaptersRead],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border p-3">
            <dd className="text-xl font-semibold" data-testid={`stat-${label}`}>
              {value}
            </dd>
            <dt className="text-xs text-muted-foreground">{label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
