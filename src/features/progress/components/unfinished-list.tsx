import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Panel } from "@/components/panel";
import { SectionHeader } from "@/components/section-header";
import type { CanonIndex } from "@/data/bible/canon-index";
import type { ChapterProgress } from "@/features/reading-plan/domain/chapter-progress";
import { formatReference } from "@/features/reading-plan/domain/reference";
import { formatVerseRanges } from "@/features/reading-plan/domain/verse-range";
import type { DateKey } from "@/utils/date-key";

interface UnfinishedListProps {
  /** Chapters started but not finished, oldest in canon order first. */
  chapters: readonly ChapterProgress[];
  index: CanonIndex;
  /** Each opens today's sheet on that chapter, so the rest can be recorded. */
  today: DateKey;
}

/**
 * The chapters left half-read.
 *
 * A part-read chapter stays at the head of the unread queue, so without a list of them
 * the only clue anything is outstanding is today's card, and a chapter logged against
 * the wrong reference never surfaces there at all. This is the backlog the reader can
 * act on directly.
 */
export function UnfinishedList({
  chapters,
  index,
  today,
}: UnfinishedListProps) {
  if (chapters.length === 0) return null;

  return (
    <section aria-labelledby="unfinished-heading">
      <SectionHeader id="unfinished-heading" title="Still to finish" />
      <Panel padded={false} className="overflow-hidden">
        <ul>
          {chapters.map(({ reference, remaining }) => {
            const label = formatReference(reference, index);
            const left = `Verses ${formatVerseRanges(remaining)} left`;
            return (
              <li
                key={`${reference.bookId}:${reference.chapter}`}
                className="border-t first:border-t-0"
              >
                <Link
                  href={`/day/${today}?book=${reference.bookId}&chapter=${reference.chapter}`}
                  aria-label={`${label}, verses ${formatVerseRanges(remaining)} left`}
                  className="flex min-h-11 items-center gap-3 px-5 py-3 outline-none transition-colors hover:bg-muted focus-visible:bg-muted active:bg-pressed"
                >
                  <span className="flex-1">
                    <span className="block text-body">{label}</span>
                    <span className="mt-0.5 block text-footnote text-muted-foreground">
                      {left}
                    </span>
                  </span>
                  <ChevronRight className="size-3.5 text-faint" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </Panel>
    </section>
  );
}
