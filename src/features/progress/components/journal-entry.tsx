import { format } from "date-fns";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { addDaysToDateKey, type DateKey, fromDateKey } from "@/utils/date-key";

import type { JournalEntry } from "../domain/reading-journal";
import {
  JournalThread,
  OpenMarker,
  QuietMarker,
  ReadMarker,
} from "./journal-thread";

/** "Today", "Yesterday", then "Wednesday 28 Oct". */
function dayLabel(date: DateKey, today: DateKey): string {
  if (date === today) return "Today";
  if (date === addDaysToDateKey(today, -1)) return "Yesterday";
  return format(fromDateKey(date), "EEEE d MMM");
}

/** "Tue 20 Oct", or "Mon 19 to Wed 21 Oct" for a run. */
function quietRange(oldest: DateKey, newest: DateKey): string {
  const from = fromDateKey(oldest);
  const to = fromDateKey(newest);
  if (oldest === newest) return format(to, "EEE d MMM");
  const sameMonth = from.getMonth() === to.getMonth();
  return `${format(from, sameMonth ? "EEE d" : "EEE d MMM")} to ${format(to, "EEE d MMM")}`;
}

const ROW_LINK =
  "flex min-h-11 gap-3 px-5 py-3 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset active:bg-pressed";

const HIGHLIGHT =
  "bg-primary-soft transition-colors duration-500 motion-reduce:transition-none";

interface JournalEntryRowProps {
  entry: JournalEntry;
  today: DateKey;
  /** The day picked in the heatmap falls on this row. */
  highlighted?: boolean;
}

/** One line of the journal: a read day, today while it is open, or a run of quiet days. */
export function JournalEntryRow({
  entry,
  today,
  highlighted = false,
}: JournalEntryRowProps) {
  if (entry.kind === "quiet") {
    return (
      <div className={cn("flex gap-3 px-5 py-2", highlighted && HIGHLIGHT)}>
        <JournalThread marker={<QuietMarker />} />
        <p className="text-footnote text-muted-foreground">
          {entry.days === 1 ? "A quiet day" : `${entry.days} quiet days`}
          <span className="text-faint">
            {", "}
            {quietRange(entry.oldest, entry.newest)}
          </span>
        </p>
      </div>
    );
  }

  if (entry.kind === "today") {
    return (
      <Link
        href={`/day/${entry.date}`}
        className={cn(ROW_LINK, highlighted && HIGHLIGHT)}
      >
        <JournalThread below={entry.below} marker={<OpenMarker />} />
        <span className="min-w-0 flex-1">
          <span className="block text-footnote text-muted-foreground">
            Today
          </span>
          <span className="mt-0.5 block text-body text-muted-foreground">
            {entry.next === null
              ? "Nothing logged yet"
              : `Next up: ${entry.next}`}
          </span>
        </span>
        <ChevronRight
          className="mt-1 size-3.5 shrink-0 text-faint"
          aria-hidden
        />
      </Link>
    );
  }

  return (
    <Link
      href={`/day/${entry.date}`}
      className={cn(ROW_LINK, highlighted && HIGHLIGHT)}
    >
      <JournalThread
        above={entry.above}
        below={entry.below}
        marker={<ReadMarker />}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-footnote text-muted-foreground">
          {dayLabel(entry.date, today)}
        </span>
        <span className="mt-0.5 block text-body font-medium">
          {entry.passage}
        </span>
        {entry.extras === null ? null : (
          <span className="mt-0.5 block text-footnote text-muted-foreground">
            Also read {entry.extras}
          </span>
        )}
      </span>
      <ChevronRight className="mt-1 size-3.5 shrink-0 text-faint" aria-hidden />
    </Link>
  );
}
