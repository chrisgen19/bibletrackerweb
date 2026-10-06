import { Check } from "lucide-react";
import Link from "next/link";

import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import type { ChapterProgress } from "@/features/reading-plan/domain/chapter-progress";
import {
  distinctReferences,
  formatReferenceSpan,
} from "@/features/reading-plan/domain/reference";
import type { DayReading } from "@/features/reading-plan/domain/types";
import { formatVerseRanges } from "@/features/reading-plan/domain/verse-range";

interface TodayReadingCardProps {
  day: DayReading;
  onMarkRead: () => void;
  /** Today's sheet, where undo and the verse control live. */
  detailHref: string;
  /** Progress on today's chapter, when a single chapter is scheduled. */
  progress?: ChapterProgress | null;
}

const Eyebrow = () => (
  <p className="text-overline text-faint uppercase">Today&apos;s reading</p>
);

const NOT_SCHEDULED_COPY = {
  "canon-complete": [
    "You have finished the Bible",
    "Every chapter from Genesis to Revelation is behind you. Start a new plan whenever you are ready.",
  ],
  "not-scheduled": [
    "Nothing scheduled",
    "Use the Custom tab to record whatever you read.",
  ],
  "before-plan": [
    "Your plan starts soon",
    "Your first reading will appear on the day your plan begins.",
  ],
} as const;

/**
 * The answer to "what should I read today?".
 *
 * Completing swaps the primary action for a quiet confirmation rather than an undo
 * button: undo stays one tap away in the day sheet, so the finished state reads as an
 * accomplishment, not a prompt to reverse it.
 */
export function TodayReadingCard({
  day,
  onMarkRead,
  detailHref,
  progress = null,
}: TodayReadingCardProps) {
  if (day.scheduled.kind !== "scheduled") {
    const [title, body] = NOT_SCHEDULED_COPY[day.scheduled.kind];
    return (
      <Panel variant="raised">
        <Eyebrow />
        <p className="mt-2 text-headline">{title}</p>
        <p className="mt-1 text-callout text-muted-foreground">{body}</p>
      </Panel>
    );
  }

  const isCompleted = day.status === "completed";
  // A completed day shows what was actually recorded, which differs from the schedule
  // after a custom log. The day sheet applies the same rule; the two must not disagree.
  // Duplicates collapse: two spans of one chapter are one chapter, not "Genesis 24-24".
  const chapters = distinctReferences(
    isCompleted && day.completedChapters.length > 0
      ? day.completedChapters
      : day.scheduled.chapters,
  );
  const reference = formatReferenceSpan(chapters);

  // A part-read chapter is a third state: the day is done, the chapter is not.
  const isPartial = progress?.isPartial === true;
  const subtitle = isPartial
    ? `${formatVerseRanges(progress?.remaining ?? [])} still to read`
    : chapters.length === 1
      ? "One chapter"
      : `${chapters.length} chapters`;

  return (
    <Panel variant="raised">
      <div className="flex items-center justify-between">
        <Eyebrow />
        <span
          aria-hidden
          className={`flex size-[22px] items-center justify-center rounded-full bg-primary-soft transition-[transform,opacity] duration-[240ms] motion-reduce:transition-none ${isCompleted ? "scale-100 opacity-100" : "scale-80 opacity-0"}`}
        >
          <Check className="size-3 text-primary" strokeWidth={3} />
        </span>
      </div>
      <h2 className="mt-2 text-display" data-testid="today-reference">
        {reference}
      </h2>
      <p className="mt-0.5 text-callout text-muted-foreground">{subtitle}</p>

      <div className="mt-5">
        {isPartial ? (
          <Button asChild size="large" className="w-full">
            <Link href={detailHref}>Continue Reading</Link>
          </Button>
        ) : isCompleted ? (
          <div className="animate-in fade-in duration-[240ms] motion-reduce:animate-none">
            <p className="flex items-center justify-center gap-2 rounded-xl bg-primary-soft py-3 text-headline text-primary">
              <Check className="size-[15px]" strokeWidth={3} aria-hidden />
              Completed today
            </p>
            <Link
              href={detailHref}
              aria-label="View today's reading details"
              className="mt-2 block rounded-sm py-3 text-center text-footnote text-faint outline-none hover:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              View details
            </Link>
          </div>
        ) : (
          <Button size="large" className="w-full" onClick={onMarkRead}>
            Mark as Read
          </Button>
        )}
      </div>
    </Panel>
  );
}
