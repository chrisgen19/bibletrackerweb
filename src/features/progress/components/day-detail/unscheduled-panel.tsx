import type { CanonIndex } from "@/data/bible/canon-index";
import { formatReference } from "@/features/reading-plan/domain/reference";

import { areRowsComplete, unscheduledMessage } from "./day-detail-logic";
import { RecordedBlock } from "./recorded-block";
import type { DayDetailProps } from "./types";
import { VerseControl } from "./verse-control";

type UnscheduledPanelProps = Pick<
  DayDetailProps,
  | "day"
  | "rows"
  | "extraRows"
  | "onSetExtra"
  | "onComplete"
  | "onUndo"
  | "onUndoEntry"
  | "getProgressFor"
  | "getCompletedOnFor"
  | "currentPosition"
> & {
  index: CanonIndex;
  kind: "canon-complete" | "not-scheduled" | "before-plan";
};

/**
 * A day the plan does not name a chapter for.
 *
 * A missed day is the interesting case. The reading position moves when you read, not
 * when the date passes, so nothing was lost and nothing needs recalculating; but the
 * reader cannot know that unless it is said, and the day is useless to them without a
 * way to record the catch-up. Both live here.
 */
export function UnscheduledPanel(props: UnscheduledPanelProps) {
  const { day, rows, index, kind, currentPosition, getProgressFor } = props;
  const hasRecord = rows.length > 0;
  const isMissed = kind === "not-scheduled";
  const catchUpProgress =
    currentPosition === null ? null : getProgressFor(currentPosition);

  return (
    <div className="mt-5">
      <p className="text-body text-muted-foreground">
        {unscheduledMessage(kind, props.extraRows.length > 0)}
      </p>

      {hasRecord ? (
        <RecordedBlock
          rows={rows}
          index={index}
          isComplete={areRowsComplete(rows, getProgressFor)}
          onUndo={props.onUndo}
          onUndoEntry={props.onUndoEntry}
          onSetExtra={props.onSetExtra}
        />
      ) : isMissed && currentPosition !== null && catchUpProgress !== null ? (
        <div className="mt-5">
          <p className="mb-2 text-overline text-faint">CATCHING UP?</p>
          <p className="mb-3 text-footnote text-muted-foreground">
            {`Record ${formatReference(currentPosition, index)} against this day — it is where you are now.`}
          </p>
          <VerseControl
            key={`${currentPosition.bookId}:${currentPosition.chapter}`}
            reference={currentPosition}
            progress={catchUpProgress}
            index={index}
            verb="Mark"
            onSubmit={(span) => props.onComplete([currentPosition], span)}
            getCompletedOnFor={props.getCompletedOnFor}
            viewedDate={day.date}
            fieldTestId="catch-up-field-to-verse"
            submitTestId="catch-up-submit"
          />
        </div>
      ) : (
        <p className="mt-3 text-footnote text-faint">
          You can still record what you read using the Custom tab.
        </p>
      )}
    </div>
  );
}
