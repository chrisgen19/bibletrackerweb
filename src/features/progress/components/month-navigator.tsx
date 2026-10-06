import { ChevronLeft, ChevronRight } from "lucide-react";

import { IconButton } from "@/components/icon-button";

interface MonthNavigatorProps {
  title: string;
  onPrevious: () => void;
  onNext: () => void;
  /** Shown when the reader has moved away from the current month. */
  onReturnToToday?: () => void;
}

export function MonthNavigator({
  title,
  onPrevious,
  onNext,
  onReturnToToday,
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
            aria-label="Jump to the current month"
            className="mt-0.5 rounded-sm py-1 text-footnote text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Back to today
          </button>
        )}
      </div>
      <div className="flex items-center gap-1">
        <IconButton
          icon={ChevronLeft}
          label="Previous month"
          onClick={onPrevious}
        />
        <IconButton icon={ChevronRight} label="Next month" onClick={onNext} />
      </div>
    </div>
  );
}
