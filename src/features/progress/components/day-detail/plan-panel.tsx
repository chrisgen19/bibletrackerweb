import { Button } from "@/components/ui/button";
import { DEFAULT_CANON_ID, getCanonIndex } from "@/data/bible/canon-index";
import {
  distinctReferences,
  formatReferenceSpan,
} from "@/features/reading-plan/domain/reference";
import { formatVerseRanges } from "@/features/reading-plan/domain/verse-range";

import { areRowsComplete, planAction } from "./day-detail-logic";
import { RecordedBlock } from "./recorded-block";
import { ReferenceBlock } from "./reference-block";
import type { DayDetailProps } from "./types";
import { UnscheduledPanel } from "./unscheduled-panel";
import { VerseControl } from "./verse-control";

type PlanPanelProps = Omit<
  DayDetailProps,
  "today" | "onChangePlan" | "completions" | "focusChapter"
> & { isFuture: boolean };

/** The "Reading plan" tab: the day's scheduled reading and how to record it. */
export function PlanPanel(props: PlanPanelProps) {
  const { day, isFuture, rows, progress, onComplete, getProgressFor } = props;
  const index = getCanonIndex(day.plan?.canonId ?? DEFAULT_CANON_ID);
  const hasRecord = rows.length > 0;

  if (day.scheduled.kind !== "scheduled") {
    return (
      <UnscheduledPanel {...props} index={index} kind={day.scheduled.kind} />
    );
  }

  // A recorded day shows exactly what was recorded, which can differ from the current
  // schedule after a plan change or a custom log. Duplicates collapse: a chapter read in
  // two sittings is one chapter, not two.
  const chapters = distinctReferences(
    hasRecord && day.completedChapters.length > 0
      ? day.completedChapters
      : day.scheduled.chapters,
  );
  const action = planAction({ day, isFuture, hasRecord, progress, chapters });

  return (
    <div>
      <ReferenceBlock
        label={isFuture ? "SCHEDULED" : hasRecord ? "RECORDED" : "READING"}
        chapters={chapters}
        index={index}
      />

      {progress?.isPartial === true ? (
        <p className="mt-3 rounded-xl bg-primary-soft p-4 text-footnote text-primary">
          {`You’ve read verses ${formatVerseRanges(progress.read)}. Verses ${formatVerseRanges(
            progress.remaining,
          )} still to go.`}
        </p>
      ) : null}

      {hasRecord ? (
        <RecordedBlock
          rows={rows}
          index={index}
          isComplete={areRowsComplete(rows, getProgressFor)}
          onUndo={props.onUndo}
          onUndoEntry={props.onUndoEntry}
          onSetExtra={props.onSetExtra}
        />
      ) : null}

      <div className="mt-5">
        {action.kind === "future-note" ? (
          <p className="rounded-lg bg-muted p-4 text-center text-callout text-muted-foreground">
            You can mark this reading once the day arrives.
          </p>
        ) : action.kind === "verse-control" && progress !== null ? (
          <VerseControl
            key={`${action.tracked.bookId}:${action.tracked.chapter}`}
            reference={action.tracked}
            progress={progress}
            index={index}
            verb="Mark"
            onSubmit={(span) => onComplete([action.tracked], span)}
            getCompletedOnFor={props.getCompletedOnFor}
            viewedDate={day.date}
            fieldTestId="field-to-verse"
            submitTestId="mark-day-read"
          />
        ) : action.kind === "mark" ? (
          <Button
            size="large"
            className="w-full"
            onClick={() => onComplete(action.chapters, undefined)}
            data-testid="mark-day-read"
          >
            <span className="truncate">{`Mark ${formatReferenceSpan(action.chapters, index)} as Read`}</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
