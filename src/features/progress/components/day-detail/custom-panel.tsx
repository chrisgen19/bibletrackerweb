"use client";

import { useState } from "react";

import { FieldRow } from "@/components/field-row";
import { Button } from "@/components/ui/button";
import type { BibleReference, VerseRange } from "@/data/bible/canon";
import { DEFAULT_CANON_ID, getCanonIndex } from "@/data/bible/canon-index";
import { BookPicker } from "@/features/reading-plan/components/book-picker";
import { ChapterPicker } from "@/features/reading-plan/components/chapter-picker";
import { formatReference } from "@/features/reading-plan/domain/reference";
import type { ReadingPlanDraft } from "@/features/reading-plan/domain/types";
import { formatVerseRanges } from "@/features/reading-plan/domain/verse-range";
import { ContinueDialog } from "./continue-dialog";
import {
  continuationAfterLog,
  continuationMessage,
  initialCustomReference,
} from "./day-detail-logic";
import type { DayDetailProps } from "./types";
import { VerseControl } from "./verse-control";

type CustomPanelProps = Omit<
  DayDetailProps,
  "onUndo" | "onUndoEntry" | "rows" | "progress"
>;

/**
 * Records a chapter the reader actually read, which need not be the scheduled one.
 *
 * After logging, it offers to move the reading position so the next unread day continues
 * from there: the schedule and the log stay independent unless the reader links them.
 */
export function CustomPanel(props: CustomPanelProps) {
  const { day, onComplete, getProgressFor } = props;
  const canonId = day.plan?.canonId ?? DEFAULT_CANON_ID;
  const index = getCanonIndex(canonId);
  const [reference, setReference] = useState<BibleReference>(() =>
    initialCustomReference({ ...props, index }),
  );
  const [picker, setPicker] = useState<"book" | "chapter" | null>(null);
  const [offer, setOffer] = useState<{
    draft: ReadingPlanDraft;
    message: string;
  } | null>(null);

  const book = index.getBook(reference.bookId);
  // Progress on whichever chapter is selected, so resuming an unfinished one starts at
  // the right verse instead of re-recording what has already been read.
  const progress = getProgressFor(reference);

  function handleLog(span?: VerseRange): boolean {
    // A refused write must not produce a continuation offer.
    if (!onComplete([reference], span)) return false;
    const draft = continuationAfterLog({ ...props, reference, span, progress });
    if (draft !== null) {
      setOffer({
        draft,
        message: continuationMessage(reference, draft, index),
      });
    }
    return true;
  }

  return (
    <div>
      <p className="mt-4 text-footnote text-muted-foreground">
        Record what you actually read on this day.
      </p>
      <div className="mt-3 overflow-hidden rounded-xl bg-muted">
        <FieldRow
          label="Book"
          value={book?.name ?? reference.bookId}
          onClick={() => setPicker("book")}
        />
        <FieldRow
          label="Chapter"
          value={String(reference.chapter)}
          onClick={() => setPicker("chapter")}
          last
        />
      </div>

      {progress?.isPartial === true ? (
        <p className="mt-3 rounded-xl bg-primary-soft p-4 text-footnote text-primary">
          {`You’ve read verses ${formatVerseRanges(progress.read)}. This continues from verse ${
            progress.remaining[0]?.from ?? 1
          }.`}
        </p>
      ) : null}

      <div className="mt-5">
        {progress === null ? (
          // Without verse counts there is no span to record. Sending one anyway would
          // write 1-1 and claim a whole chapter had been read from a single verse.
          <Button size="large" className="w-full" onClick={() => handleLog()}>
            <span className="truncate">{`Log ${formatReference(reference, index)} as Read`}</span>
          </Button>
        ) : (
          <VerseControl
            key={`${reference.bookId}:${reference.chapter}`}
            reference={reference}
            progress={progress}
            index={index}
            verb="Log"
            onSubmit={(span) => handleLog(span)}
            getCompletedOnFor={props.getCompletedOnFor}
            viewedDate={day.date}
          />
        )}
      </div>

      <BookPicker
        open={picker === "book"}
        canonId={canonId}
        selectedBookId={reference.bookId}
        onClose={() => setPicker(null)}
        onSelect={(selected) =>
          setReference((current) => ({
            bookId: selected.id,
            chapter: Math.min(current.chapter, selected.chapterCount),
          }))
        }
      />
      <ChapterPicker
        open={picker === "chapter"}
        canonId={canonId}
        bookId={reference.bookId}
        selectedChapter={reference.chapter}
        onClose={() => setPicker(null)}
        onSelect={(chapter) =>
          setReference((current) => ({ ...current, chapter }))
        }
      />

      <ContinueDialog
        message={offer?.message ?? null}
        onAccept={() => offer !== null && props.onChangePlan(offer.draft)}
        onClose={() => setOffer(null)}
      />
    </div>
  );
}
