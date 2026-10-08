import { X } from "lucide-react";

import { IconButton } from "@/components/icon-button";
import { Button } from "@/components/ui/button";
import type { CanonIndex } from "@/data/bible/canon-index";
import type { ReadingCompletion } from "@/features/reading-plan/domain/types";

import { describeRow } from "./day-detail-logic";

interface ExtraReadingsBlockProps {
  rows: readonly ReadingCompletion[];
  index: CanonIndex;
  onSetExtra: (id: string, isExtra: boolean) => void;
  onUndoEntry: (id: string) => void;
}

/**
 * The extra readings recorded on a day (bibletrackerweb#18): logged, but outside the
 * plan. Each can be brought into the plan or removed on its own.
 */
export function ExtraReadingsBlock({
  rows,
  index,
  onSetExtra,
  onUndoEntry,
}: ExtraReadingsBlockProps) {
  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="extra-readings-heading" className="mt-6">
      <h2 id="extra-readings-heading" className="text-overline text-faint">
        EXTRA READINGS
      </h2>
      <p className="mt-1 text-footnote text-muted-foreground">
        Logged on this day, outside your plan.
      </p>
      <ul className="mt-2">
        {rows.map((row) => (
          <li key={row.id} className="flex min-h-11 items-center gap-1">
            <span className="flex-1 text-body">{describeRow(row, index)}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSetExtra(row.id, false)}
              data-testid={`count-entry-${row.id}`}
            >
              Count toward plan
            </Button>
            <IconButton
              icon={X}
              variant="plain"
              label={`Remove ${describeRow(row, index)}`}
              onClick={() => onUndoEntry(row.id)}
              testId={`remove-extra-${row.id}`}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
