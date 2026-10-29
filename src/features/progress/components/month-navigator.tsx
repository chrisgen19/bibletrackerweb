import { ChevronLeft, ChevronRight } from "lucide-react";

import { IconButton } from "@/components/icon-button";

interface MonthNavigatorProps {
  title: string;
  onPrevious: () => void;
  onNext: () => void;
  /** Shown when the reader has moved away from the current month. */
  onReturnToToday?: () => void;
  /** What a step moves by, for the buttons' labels: "month" unless the strip shows weeks. */
  unit?: "week" | "month";
}

export function MonthNavigator({
  title,
  onPrevious,
  onNext,
  onReturnToToday,
  unit = "month",
}: MonthNavigatorProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-title" aria-live="polite">
          {title}
        </h2>
        {onReturnToToday === undefined ? null : (
          <button
            type="button"
            onClick={onReturnToToday}
            aria-label={`Jump to the current ${unit}`}
            className="mt-0.5 rounded-sm py-1 text-footnote text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Back to today
          </button>
        )}
      </div>
      <div className="flex items-center gap-1">
        <IconButton
          icon={ChevronLeft}
          label={`Previous ${unit}`}
          onClick={onPrevious}
        />
        <IconButton
          icon={ChevronRight}
          label={`Next ${unit}`}
          onClick={onNext}
        />
      </div>
    </div>
  );
}
