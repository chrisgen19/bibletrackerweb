"use client";

import { format } from "date-fns";
import { useState } from "react";

import { FieldRow } from "@/components/field-row";
import { Panel } from "@/components/panel";
import { getCanonIndex } from "@/data/bible/canon-index";
import { useReadingData } from "@/features/reading-plan/hooks/reading-data-provider";
import { type DateKey, fromDateKey, isValidDateKey } from "@/utils/date-key";

import { BookPicker } from "./book-picker";
import { ChapterPicker } from "./chapter-picker";

export interface ReadingPosition {
  bookId: string;
  chapter: number;
  startDate: DateKey;
}

interface ReadingPositionFieldsProps {
  canonId: string;
  value: ReadingPosition;
  onChange: (next: ReadingPosition) => void;
  /**
   * Offers the start date as a collapsed disclosure. Off for the reading plan screen,
   * where moving your position always takes effect from today.
   */
  allowStartDate?: boolean;
}

/**
 * Book / chapter / start-date editor shared by onboarding and the reading plan screen.
 *
 * Choosing a book clamps the chapter into range, so an invalid reference can never reach
 * the domain layer. The start date stays collapsed and reading "Today" unless the reader
 * opens it, keeping the common path a two-field decision.
 */
export function ReadingPositionFields({
  canonId,
  value,
  onChange,
  allowStartDate = false,
}: ReadingPositionFieldsProps) {
  const { today } = useReadingData();
  const [picker, setPicker] = useState<"book" | "chapter" | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const index = getCanonIndex(canonId);
  const book = index.getBook(value.bookId);
  const startDay = fromDateKey(value.startDate);
  const startsToday = value.startDate === today;

  return (
    <div>
      <Panel padded={false} className="overflow-hidden">
        <FieldRow
          label="Book"
          value={book?.name ?? value.bookId}
          onClick={() => setPicker("book")}
        />
        <FieldRow
          label="Chapter"
          value={String(value.chapter)}
          onClick={() => setPicker("chapter")}
          last={!allowStartDate}
        />
        {allowStartDate ? (
          <>
            <FieldRow
              label="Start date"
              value={startsToday ? "Today" : format(startDay, "d MMM yyyy")}
              onClick={() => setDateOpen((open) => !open)}
              expanded={dateOpen}
              last
            />
            {dateOpen ? (
              <div className="border-t px-4 py-3">
                <input
                  type="date"
                  aria-label="Plan start date"
                  value={value.startDate}
                  onChange={(event) => {
                    if (isValidDateKey(event.target.value)) {
                      onChange({ ...value, startDate: event.target.value });
                    }
                  }}
                  className="h-11 w-full rounded-lg bg-muted px-3 text-body outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            ) : null}
          </>
        ) : null}
      </Panel>

      {allowStartDate ? (
        <p className="mt-2 text-footnote text-faint">
          {startsToday
            ? "Started earlier? Set the date your plan began and the calendar will fill in from there."
            : `Your plan begins on ${format(startDay, "EEEE d MMMM")}, so earlier days will appear on your calendar.`}
        </p>
      ) : null}

      <BookPicker
        open={picker === "book"}
        canonId={canonId}
        selectedBookId={value.bookId}
        onClose={() => setPicker(null)}
        onSelect={(selected) =>
          onChange({
            ...value,
            bookId: selected.id,
            chapter: Math.min(value.chapter, selected.chapterCount),
          })
        }
      />
      <ChapterPicker
        open={picker === "chapter"}
        canonId={canonId}
        bookId={value.bookId}
        selectedChapter={value.chapter}
        onClose={() => setPicker(null)}
        onSelect={(chapter) => onChange({ ...value, chapter })}
      />
    </div>
  );
}
