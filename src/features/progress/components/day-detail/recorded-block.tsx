import { Check, X } from "lucide-react";

import { IconButton } from "@/components/icon-button";
import { Button } from "@/components/ui/button";
import type { CanonIndex } from "@/data/bible/canon-index";
import {
  distinctReferences,
  formatReferenceSpan,
} from "@/features/reading-plan/domain/reference";
import type { ReadingCompletion } from "@/features/reading-plan/domain/types";

import { describeRow } from "./day-detail-logic";

interface RecordedBlockProps {
  rows: readonly ReadingCompletion[];
  index: CanonIndex;
  isComplete: boolean;
  onUndo: () => void;
  onUndoEntry: (id: string) => void;
  /** Moves a reading out of the plan (bibletrackerweb#18). */
  onSetExtra: (id: string, isExtra: boolean) => void;
}

/**
 * What this day holds, and how to take it back.
 *
 * Rendered whenever the day has rows, including a part-read chapter. Gating removal on
 * the *chapter* being finished stranded anyone who logged the wrong reference: the day
 * showed as complete on the calendar while the sheet offered only to read more of a
 * chapter they had never opened.
 */
export function RecordedBlock({
  rows,
  index,
  isComplete,
  onUndo,
  onUndoEntry,
  onSetExtra,
}: RecordedBlockProps) {
  const chapters = distinctReferences(
    rows.map((row) => ({ bookId: row.bookId, chapter: row.chapter })),
  );
  const single = rows.length === 1;

  return (
    <div className="mt-4 animate-in fade-in duration-[240ms] motion-reduce:animate-none">
      <p className="flex items-center justify-center gap-2 text-center text-headline text-primary">
        {isComplete ? (
          <Check className="size-[15px] shrink-0" strokeWidth={3} aria-hidden />
        ) : null}
        {isComplete
          ? `${formatReferenceSpan(chapters, index)} completed`
          : `${rows.map((row) => describeRow(row, index)).join(", ")} recorded`}
      </p>

      {/* One entry needs no list; several do, so the wrong one can go on its own. */}
      {single ? (
        <div className="mt-2 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSetExtra(rows[0]?.id ?? "", true)}
            data-testid="mark-extra"
          >
            Not part of your plan? Mark as extra
          </Button>
        </div>
      ) : (
        <ul className="mt-3">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center py-1">
              <span className="flex-1 text-footnote text-muted-foreground">
                {describeRow(row, index)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSetExtra(row.id, true)}
                data-testid={`mark-extra-${row.id}`}
              >
                Mark as extra
              </Button>
              <IconButton
                icon={X}
                variant="plain"
                label={`Remove ${describeRow(row, index)}`}
                onClick={() => onUndoEntry(row.id)}
                testId={`remove-entry-${row.id}`}
              />
            </li>
          ))}
        </ul>
      )}

      <Button
        variant="destructive"
        size="large"
        className="mt-4 w-full"
        onClick={onUndo}
        data-testid="undo-completion"
      >
        {single ? "Remove This Reading" : "Remove All Readings"}
      </Button>
    </div>
  );
}
