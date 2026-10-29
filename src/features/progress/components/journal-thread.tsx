import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { ThreadLink } from "../domain/reading-journal";

/** Where a row's marker sits: level with the middle of its first line of text. */
export const MARKER_TOP = "top-[21px]";

const LINE_CLASS: Record<ThreadLink, string | null> = {
  chain: "bg-primary",
  // An unread today: the chain can still carry on, so it is drawn, but faintly.
  open: "bg-primary-muted",
  none: null,
};

interface JournalThreadProps {
  above?: ThreadLink;
  below?: ThreadLink;
  /** A week heading: the chain, if any, passes straight through. */
  through?: ThreadLink;
  marker?: ReactNode;
}

/**
 * The left gutter of a journal row: a marker for the day, and the thread that joins it
 * to the read days either side. Rows sit flush, so the segments meet into one line.
 */
export function JournalThread({
  above = "none",
  below = "none",
  through,
  marker,
}: JournalThreadProps) {
  const lineAbove = LINE_CLASS[through ?? above];
  const lineBelow = through === undefined ? LINE_CLASS[below] : null;
  const line = "absolute left-1/2 w-0.5 -translate-x-1/2";

  return (
    <span aria-hidden className="relative w-3 shrink-0 self-stretch">
      {lineAbove === null ? null : (
        <span
          className={cn(
            line,
            "top-0",
            through === undefined ? "h-[21px]" : "bottom-0",
            lineAbove,
          )}
        />
      )}
      {lineBelow === null ? null : (
        <span className={cn(line, "bottom-0", MARKER_TOP, lineBelow)} />
      )}
      {marker}
    </span>
  );
}

/** A read day: a solid bead on the thread. */
export function ReadMarker() {
  return (
    <span
      className={cn(
        "absolute left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary",
        MARKER_TOP,
      )}
    />
  );
}

/** Today, still open: a ring waiting to be filled. */
export function OpenMarker() {
  return (
    <span
      className={cn(
        "absolute left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-card",
        MARKER_TOP,
      )}
    />
  );
}

/** Quiet days: a small neutral dot, no thread. */
export function QuietMarker() {
  return (
    <span className="absolute top-[17px] left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border-strong" />
  );
}
