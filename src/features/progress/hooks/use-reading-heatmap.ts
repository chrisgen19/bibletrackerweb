import { useMemo } from "react";

import { DEFAULT_CANON_ID, getCanonIndex } from "@/data/bible/canon-index";
import { getEarliestPlanStart } from "@/features/reading-plan/domain/schedule";
import { useReadingData } from "@/features/reading-plan/hooks/reading-data-provider";

import { buildHeatmap, type Heatmap } from "../domain/reading-heatmap";

/** Half a year: enough to see a habit form, small enough for a phone's width. */
export const HEATMAP_WEEKS = 26;

/**
 * The last half year of reading, extras included, derived on the client from the
 * snapshot the provider already holds: no extra requests.
 */
export function useReadingHeatmap(): Heatmap {
  const { plans, activePlan, completionLookup, today } = useReadingData();

  return useMemo(
    () =>
      buildHeatmap({
        today,
        planStart: getEarliestPlanStart(plans),
        rowsOn: completionLookup.get,
        index: getCanonIndex(activePlan?.canonId ?? DEFAULT_CANON_ID),
        weekCount: HEATMAP_WEEKS,
      }),
    [plans, activePlan, completionLookup, today],
  );
}
