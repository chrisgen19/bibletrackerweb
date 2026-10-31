import { format } from "date-fns";
import type { ReactNode } from "react";

import { useReadingPerspective } from "@/features/reading-plan/hooks/reading-view-context";
import { cn } from "@/lib/utils";

import {
  type MonthKey,
  monthKeyId,
  monthKeysEqual,
  monthKeyToDate,
} from "../domain/calendar-month";
import type { HeatMonthLabel } from "../domain/reading-heatmap";

/** A label needs about three columns to fit without colliding with the next. */
const MIN_LABEL_SPAN = 3;

interface HeatmapMonthLabelsProps {
  months: readonly HeatMonthLabel[];
  weekCount: number;
  /** The month of the picked day. */
  shownMonth: MonthKey;
  onPickMonth: (month: MonthKey) => void;
}

/**
 * Month names over the heatmap's columns, as its header row so they line up exactly.
 * Each one finds that month in the journal below.
 */
export function HeatmapMonthLabels({
  months,
  weekCount,
  shownMonth,
  onPickMonth,
}: HeatmapMonthLabelsProps) {
  const journal =
    useReadingPerspective() === "friend" ? "the journal" : "your journal";
  const cells: ReactNode[] = [];
  let column = 0;
  for (const month of months) {
    if (month.span < MIN_LABEL_SPAN) continue;
    if (month.week > column)
      cells.push(<td key={`gap-${column}`} colSpan={month.week - column} />);
    const shown = monthKeysEqual(month.key, shownMonth);
    cells.push(
      <th
        key={monthKeyId(month.key)}
        scope="colgroup"
        colSpan={month.span}
        className="p-0 text-left font-normal"
      >
        <button
          type="button"
          onClick={() => onPickMonth(month.key)}
          aria-label={`Show ${format(monthKeyToDate(month.key), "MMMM yyyy")} in ${journal}`}
          className={cn(
            "flex h-10 w-full items-end rounded-sm pb-1 text-footnote outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            shown
              ? "font-semibold text-foreground underline decoration-2 decoration-primary underline-offset-4"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {month.label}
        </button>
      </th>,
    );
    column = month.week + month.span;
  }
  if (column < weekCount)
    cells.push(<td key="gap-end" colSpan={weekCount - column} />);

  return (
    <thead>
      <tr>
        <td className="hidden w-8 sm:table-cell" />
        {cells}
      </tr>
    </thead>
  );
}
