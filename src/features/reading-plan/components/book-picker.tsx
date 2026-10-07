"use client";

import {
  type KeyboardEvent,
  type RefObject,
  useId,
  useMemo,
  useState,
} from "react";

import type { BibleBook } from "@/data/bible/canon";
import { getCanonIndex } from "@/data/bible/canon-index";

import { BookList } from "./book-list";
import { PickerDialog } from "./picker-dialog";

interface BookPickerProps {
  open: boolean;
  canonId: string;
  selectedBookId: string;
  onSelect: (book: BibleBook) => void;
  onClose: () => void;
  /** The row that opened the picker, which gets the focus back when it closes. */
  returnFocusRef: RefObject<HTMLElement | null>;
}

function matches(book: BibleBook, query: string): boolean {
  if (query === "") return true;
  const needle = query.trim().toLowerCase();
  return (
    book.name.toLowerCase().includes(needle) ||
    book.abbreviation.toLowerCase().includes(needle)
  );
}

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
  returnFocusRef,
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
      returnFocusRef={returnFocusRef}
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
      <BookList
        id={listId}
        books={results}
        query={query}
        activeId={activeBook?.id ?? null}
        selectedBookId={selectedBookId}
        onChoose={choose}
        onHover={setActive}
      />
    </PickerDialog>
  );
}
