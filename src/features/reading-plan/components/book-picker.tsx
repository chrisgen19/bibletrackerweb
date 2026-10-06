"use client";

import { type KeyboardEvent, useId, useMemo, useState } from "react";

import type { BibleBook } from "@/data/bible/canon";
import { getCanonIndex } from "@/data/bible/canon-index";
import { cn } from "@/lib/utils";

import { PickerDialog } from "./picker-dialog";

interface BookPickerProps {
  open: boolean;
  canonId: string;
  selectedBookId: string;
  onSelect: (book: BibleBook) => void;
  onClose: () => void;
}

function matches(book: BibleBook, query: string): boolean {
  if (query === "") return true;
  const needle = query.trim().toLowerCase();
  return (
    book.name.toLowerCase().includes(needle) ||
    book.abbreviation.toLowerCase().includes(needle)
  );
}

const TESTAMENT_LABEL = { old: "Old Testament", new: "New Testament" } as const;

/**
 * Searchable book list, grouped by testament when no query is active. Type to filter;
 * the arrow keys move through the matches and Enter picks one.
 */
export function BookPicker({
  open,
  canonId,
  selectedBookId,
  onSelect,
  onClose,
}: BookPickerProps) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const books = getCanonIndex(canonId).books;
  const results = useMemo(
    () => books.filter((book) => matches(book, query)),
    [books, query],
  );
  const [active, setActive] = useState(0);
  const activeBook = results[Math.min(active, results.length - 1)];

  function choose(book: BibleBook) {
    onSelect(book);
    onClose();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (step !== undefined) {
      event.preventDefault();
      setActive((current) =>
        Math.min(results.length - 1, Math.max(0, current + step)),
      );
    } else if (event.key === "Enter" && activeBook !== undefined) {
      event.preventDefault();
      choose(activeBook);
    }
  }

  return (
    <PickerDialog
      open={open}
      onClose={onClose}
      title="Choose a book"
      closeLabel="Close book picker"
      toolbar={
        <div className="px-5 pt-3">
          <input
            type="search"
            role="combobox"
            aria-label="Search books"
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={
              activeBook === undefined
                ? undefined
                : `${listId}-${activeBook.id}`
            }
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search books"
            autoComplete="off"
            data-autofocus=""
            className="h-11 w-full rounded-lg bg-muted px-4 text-body outline-none placeholder:text-faint focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      }
    >
      {results.length === 0 ? (
        <p className="py-8 text-center text-callout text-muted-foreground">
          No books match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div id={listId} role="listbox" aria-label="Books">
          {results.map((book, position) => {
            const previous = results[position - 1];
            const showSection =
              query === "" && previous?.testament !== book.testament;
            return (
              <div key={book.id} role="presentation">
                {showSection ? (
                  <p
                    role="presentation"
                    className={cn(
                      "mb-2 text-overline text-faint uppercase",
                      position > 0 && "mt-5",
                    )}
                  >
                    {TESTAMENT_LABEL[book.testament]}
                  </p>
                ) : null}
                <div
                  id={`${listId}-${book.id}`}
                  role="option"
                  aria-selected={book.id === selectedBookId}
                  aria-label={`${book.name}, ${book.chapterCount} chapters`}
                  tabIndex={-1}
                  onClick={() => choose(book)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") choose(book);
                  }}
                  onMouseMove={() => setActive(position)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center rounded-sm px-3 text-body",
                    book === activeBook && "bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex-1",
                      book.id === selectedBookId && "text-primary",
                    )}
                  >
                    {book.name}
                  </span>
                  <span className="text-footnote text-faint">
                    {book.chapterCount}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PickerDialog>
  );
}
