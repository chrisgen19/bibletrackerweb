"use client";

import { useState } from "react";

import { FieldRow } from "@/components/field-row";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import type { BibleReference, VerseRange } from "@/data/bible/canon";
import type { CanonIndex } from "@/data/bible/canon-index";
import { VersePicker } from "@/features/reading-plan/components/verse-picker";
import type { ChapterProgress } from "@/features/reading-plan/domain/chapter-progress";
import { formatReference } from "@/features/reading-plan/domain/reference";
import type { DateKey } from "@/utils/date-key";

import { verseControlCopy, verseSelection } from "./day-detail-logic";

interface VerseControlProps {
  reference: BibleReference;
  progress: ChapterProgress;
  index: CanonIndex;
  /** "Mark" on the reading-plan side, "Log" when recording something by hand. */
  verb: "Mark" | "Log";
  /** Returns false when the write was refused, so the selection is not cleared. */
  onSubmit: (span: VerseRange) => boolean;
  getCompletedOnFor: (reference: BibleReference) => DateKey | null;
  /** The day being viewed, to tell "recorded here" from "read on another day". */
  viewedDate: DateKey;
  /** The iOS testIDs, so its ported tests find the same controls. */
  fieldTestId: string;
  submitTestId: string;
}

/**
 * "I read up to verse N", and the button that records it.
 *
 * Shared by the plan tab, the catch-up block and the Custom tab so the three cannot
 * drift apart in wording or in what they write. Remount it with a `key` when the chapter
 * changes and the pending selection resets itself.
 */
export function VerseControl({
  reference,
  progress,
  index,
  verb,
  onSubmit,
  getCompletedOnFor,
  viewedDate,
  fieldTestId,
  submitTestId,
}: VerseControlProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [toVerse, setToVerse] = useState<number | null>(null);

  const selection = verseSelection(progress, toVerse);
  const chapterLabel = formatReference(reference, index);
  const copy = verseControlCopy({
    progress,
    selection,
    verb,
    chapterLabel,
    completedOn: progress.isComplete ? getCompletedOnFor(reference) : null,
    viewedDate,
  });

  return (
    <div>
      <div className="mb-3">
        <Panel padded={false} className="overflow-hidden">
          <FieldRow
            label="Read up to verse"
            value={copy.fieldValue}
            onClick={() => setPickerOpen(true)}
            expanded={pickerOpen}
            last
            testId={fieldTestId}
          />
        </Panel>
        {copy.hint === null ? null : (
          <p className="mt-2 text-footnote text-faint">{copy.hint}</p>
        )}
      </div>

      {copy.alreadyRead === null ? null : (
        <p
          className="mb-3 rounded-xl bg-primary-soft p-4 text-footnote text-primary"
          data-testid={`${submitTestId}-already-read`}
        >
          {copy.alreadyRead}
        </p>
      )}

      <Button
        variant={progress.isComplete ? "secondary" : "default"}
        size="large"
        className="w-full"
        onClick={() => {
          if (onSubmit(selection.span)) setToVerse(null);
        }}
        data-testid={submitTestId}
      >
        <span className="truncate">{copy.submitLabel}</span>
      </Button>

      <VersePicker
        open={pickerOpen}
        chapterLabel={chapterLabel}
        fromVerse={selection.fromVerse}
        verseCount={selection.lastVerse}
        selectedTo={selection.endVerse}
        onSelect={setToVerse}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
