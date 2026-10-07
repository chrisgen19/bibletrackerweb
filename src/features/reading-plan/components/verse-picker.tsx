"use client";

import { NumberGrid } from "./number-grid";
import { PickerDialog } from "./picker-dialog";

interface VersePickerProps {
  open: boolean;
  /** Label for the chapter being read, e.g. "Genesis 1". */
  chapterLabel: string;
  /** The first verse not yet read. Selection starts here. */
  fromVerse: number;
  verseCount: number;
  /** Currently chosen end verse, so it can be shown as selected. */
  selectedTo: number;
  onSelect: (toVerse: number) => void;
  onClose: () => void;
}

/**
 * "I read up to verse N."
 *
 * Deliberately not a from/to pair. The start is derived from what has already been read,
 * so finishing a chapter tomorrow is one tap on the last verse rather than two
 * selections. Arbitrary spans remain representable in storage; this is just the path
 * that matches how people actually read.
 */
export function VersePicker({
  open,
  chapterLabel,
  fromVerse,
  verseCount,
  selectedTo,
  onSelect,
  onClose,
}: VersePickerProps) {
  const verses = Array.from(
    { length: Math.max(0, verseCount - fromVerse + 1) },
    (_, offset) => fromVerse + offset,
  );

  return (
    <PickerDialog
      open={open}
      onClose={onClose}
      title="How far did you read?"
      description={
        fromVerse === 1
          ? `${chapterLabel} · ${verseCount} verses`
          : `${chapterLabel} · continuing from verse ${fromVerse}`
      }
      closeLabel="Close verse picker"
    >
      <NumberGrid
        numbers={verses}
        selected={selectedTo}
        emphasised={verseCount}
        label="Verses"
        labelFor={(verse) =>
          verse === verseCount
            ? `To verse ${verse}, finishes the chapter`
            : `To verse ${verse}`
        }
        onSelect={(verse) => {
          onSelect(verse);
          onClose();
        }}
      />
    </PickerDialog>
  );
}
