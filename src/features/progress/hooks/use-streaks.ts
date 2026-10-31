import { useMemo } from "react";

import { useReadingView } from "@/features/reading-plan/hooks/reading-view-context";

import { calculateStreaks, type StreakSummary } from "../domain/streak";

export function useStreaks(): StreakSummary {
  const { plans, completionLookup, scheduleContext, today } = useReadingView();

  return useMemo(
    () =>
      calculateStreaks({
        plans,
        completions: completionLookup,
        context: scheduleContext,
        today,
      }),
    [plans, completionLookup, scheduleContext, today],
  );
}
