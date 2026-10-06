import type { BibleBook } from "@/data/bible/canon";
import { cn } from "@/lib/utils";

const TESTAMENT_LABEL = { old: "Old Testament", new: "New Testament" } as const;

interface BookListProps {
  /** The listbox id the search field controls. */
  id: string;
  books: readonly BibleBook[];
  query: string;
  /** The option the arrow keys are on. */
  activeId: string | null;
  selectedBookId: string;
  onChoose: (book: BibleBook) => void;
  onHover: (position: number) => void;
}

/** The book picker's results, grouped by testament when nothing is being searched. */
export function BookList({
  id,
  books,
  query,
  activeId,
  selectedBookId,
  onChoose,
  onHover,
}: BookListProps) {
  if (books.length === 0) {
    return (
      <p className="py-8 text-center text-callout text-muted-foreground">
        No books match &ldquo;{query}&rdquo;.
      </p>
    );
  }

  return (
    <div id={id} role="listbox" aria-label="Books">
      {books.map((book, position) => {
        const showSection =
          query === "" && books[position - 1]?.testament !== book.testament;
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
              id={`${id}-${book.id}`}
              role="option"
              aria-selected={book.id === selectedBookId}
              aria-label={`${book.name}, ${book.chapterCount} chapters`}
              tabIndex={-1}
              onClick={() => onChoose(book)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onChoose(book);
              }}
              onMouseMove={() => onHover(position)}
              className={cn(
                "flex min-h-11 cursor-pointer items-center rounded-sm px-3 text-body",
                book.id === activeId && "bg-muted",
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
  );
}
