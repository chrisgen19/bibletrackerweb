"use client";

import type { Ref } from "react";

import { Panel } from "@/components/panel";
import type { DateKey } from "@/utils/date-key";

import type { ReadingJournalState } from "../hooks/use-reading-journal";
import { JournalEntryRow } from "./journal-entry";
import { JournalThread } from "./journal-thread";

interface ReadingJournalProps {
  journal: ReadingJournalState;
  /** The day picked in the heatmap: its entry is tinted so the eye lands on it. */
  highlight?: DateKey | null;
  /** The entries' list, for finding the row a picked day belongs to. */
  listRef?: Ref<HTMLDivElement>;
  className?: string;
}

/**
 * What the reader has read, day by day, newest first. Read days hang on one thread, so a
 * run of days shows as an unbroken line; unread days fold into a quiet note and the line
 * simply pauses. Each day opens its sheet.
 */
export function ReadingJournal({
  journal,
  highlight = null,
  listRef,
  className,
}: ReadingJournalProps) {
  const { weeks, summary, canShowEarlier, showEarlier, today } = journal;

  return (
    <section aria-labelledby="journal-heading" className={className}>
      <Panel padded={false} className="overflow-hidden">
        <div className="px-5 pt-5">
          <h2 id="journal-heading" className="text-headline">
            Reading journal
          </h2>
          <p className="mt-1 text-callout text-muted-foreground">
            {summary ??
              "Every day you read will gather here, with what you read."}
          </p>
        </div>

        <div ref={listRef} className="mt-2 pb-2">
          {weeks.map((week) => {
            const headingId = `journal-week-${week.start}`;
            return (
              <section key={week.start} aria-labelledby={headingId}>
                <div className="flex gap-3 px-5">
                  <JournalThread through={week.threaded} />
                  <h3
                    id={headingId}
                    className="pt-4 pb-1 text-footnote font-semibold text-muted-foreground"
                  >
                    {week.label}
                  </h3>
                </div>
                <ol>
                  {week.entries.map((entry) => {
                    const newest =
                      entry.kind === "quiet" ? entry.newest : entry.date;
                    const oldest =
                      entry.kind === "quiet" ? entry.oldest : entry.date;
                    return (
                      <li
                        key={newest}
                        data-journal-newest={newest}
                        data-journal-oldest={oldest}
                        // Room above, so a row scrolled to sits clear of the page edge.
                        className="scroll-mt-24"
                      >
                        <JournalEntryRow
                          entry={entry}
                          today={today}
                          highlighted={
                            highlight !== null &&
                            oldest <= highlight &&
                            highlight <= newest
                          }
                        />
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>

        {canShowEarlier ? (
          <button
            type="button"
            onClick={showEarlier}
            className="flex min-h-11 w-full items-center justify-center border-t px-5 text-callout font-medium text-primary outline-none transition-colors hover:bg-primary-soft focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
          >
            Show earlier
          </button>
        ) : null}
      </Panel>
    </section>
  );
}
