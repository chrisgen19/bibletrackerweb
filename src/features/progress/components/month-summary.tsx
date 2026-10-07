import { ProgressRing } from "@/components/progress-ring";

import {
  describeMonthProgress,
  type MonthStatistics,
} from "../domain/month-statistics";

interface MonthSummaryProps {
  statistics: MonthStatistics;
}

/**
 * The headline number for the selected month.
 *
 * Months that predate the plan, and months still to come, get descriptive copy instead
 * of a percentage: reporting "0%" for time the reader could not have read would be both
 * wrong and discouraging.
 */
export function MonthSummary({ statistics }: MonthSummaryProps) {
  const showRing = statistics.kind === "past" || statistics.kind === "current";
  const headline = describeMonthProgress(statistics);

  const supporting =
    statistics.kind === "past" || statistics.kind === "current"
      ? `${statistics.percent}% complete`
      : statistics.kind === "future"
        ? "Planned readings"
        : statistics.kind === "before-plan"
          ? "Nothing was scheduled yet"
          : "Start a plan to begin tracking";

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-headline">{headline}</p>
        <p className="mt-0.5 text-callout text-muted-foreground">
          {supporting}
        </p>
      </div>
      {showRing ? (
        <ProgressRing
          percent={statistics.percent}
          label={`${statistics.percent} percent`}
        />
      ) : null}
    </div>
  );
}
