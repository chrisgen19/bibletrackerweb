"use client";

import type { RefObject } from "react";

import { getCanonIndex } from "@/data/bible/canon-index";

import { NumberGrid } from "./number-grid";
import { PickerDialog } from "./picker-dialog";

interface ChapterPickerProps {
  open: boolean;
  canonId: string;
  bookId: string;
  selectedChapter: number;
  onSelect: (chapter: number) => void;
  onClose: () => void;
  /** The row that opened the picker, which gets the focus back when it closes. */
  returnFocusRef: RefObject<HTMLElement | null>;
}

/** Numeric grid sized to the selected book, so an invalid chapter cannot be chosen. */
export function ChapterPicker({
  open,
  canonId,
  bookId,
  selectedChapter,
  onSelect,
  onClose,
  returnFocusRef,
}: ChapterPickerProps) {
  const book = getCanonIndex(canonId).getBook(bookId);
  const chapters = Array.from(
    { length: book?.chapterCount ?? 1 },
    (_, index) => index + 1,
  );

  return (
    <PickerDialog
      open={open}
      onClose={onClose}
      title="Choose a chapter"
      description={book?.name ?? bookId}
      closeLabel="Close chapter picker"
      returnFocusRef={returnFocusRef}
    >
      <NumberGrid
        numbers={chapters}
        selected={selectedChapter}
        label="Chapters"
        labelFor={(chapter) => `Chapter ${chapter}`}
        onSelect={(chapter) => {
          onSelect(chapter);
          onClose();
        }}
      />
    </PickerDialog>
  );
}
