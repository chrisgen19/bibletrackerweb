"use client";

import { format } from "date-fns";
import { Calendar } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { SheetTitle } from "@/components/ui/sheet";
import { DEFAULT_CANON_ID, getCanonIndex } from "@/data/bible/canon-index";
import { describeRow } from "@/features/progress/components/day-detail/day-detail-logic";
import { describePassages } from "@/features/progress/domain/reading-journal";
import { formatReferenceSpan } from "@/features/reading-plan/domain/reference";
import { getDayReading } from "@/features/reading-plan/domain/schedule";
import { useReadingView } from "@/features/reading-plan/hooks/reading-view-context";
import { compareDateKeys, fromDateKey, isValidDateKey } from "@/utils/date-key";

interface FriendDayDetailProps {
  date: string;
  /** "sheet" inside the day sheet, whose title names the dialog; "page" on its own page. */
  heading: "page" | "sheet";
}

function Line({ label, children }: { label: string; children: string }) {
  return (
    <div className="mt-4">
      <p className="text-overline text-faint">{label}</p>
      <p className="mt-1 text-body">{children}</p>
    </div>
  );
}

/**
 * One day of a friend's reading, view-only: what the plan scheduled and what they read.
 * Reads the friend's view from context, so it renders under `FriendReadingProvider`. It
 * has no controls of its own: nothing here can be recorded or changed.
 */
export function FriendDayDetail({ date, heading }: FriendDayDetailProps) {
  const {
    plans,
    planScheduleContext,
    planCompletionLookup,
    completionLookup,
    today,
  } = useReadingView();

  if (!isValidDateKey(date)) {
    return (
      <>
        {/* The dialog needs a name; the empty state has no heading of its own. */}
        {heading === "sheet" ? (
          <SheetTitle className="sr-only">Day unavailable</SheetTitle>
        ) : null}
        <EmptyState
          icon={Calendar}
          title="That day isn't available"
          description="We couldn't find a reading for that date."
          compact
        />
      </>
    );
  }

  const day = getDayReading(plans, date, planScheduleContext);
  const index = getCanonIndex(day.plan?.canonId ?? DEFAULT_CANON_ID);
  const rows = planCompletionLookup.get(date) ?? [];
  const extras = (completionLookup.get(date) ?? []).filter(
    (row) => row.isExtra === true,
  );
  const comparison = compareDateKeys(date, today);
  const parsed = fromDateKey(date);
  const title = format(parsed, "d MMMM yyyy");

  return (
    <div>
      <p className="text-overline text-faint">
        {date === today ? "TODAY" : format(parsed, "EEEE").toUpperCase()}
      </p>
      {heading === "sheet" ? (
        <SheetTitle className="mt-1 text-title">{title}</SheetTitle>
      ) : (
        <h1 className="mt-1 text-title">{title}</h1>
      )}

      {day.scheduled.kind === "scheduled" ? (
        <Line label="Planned">
          {formatReferenceSpan(day.scheduled.chapters, index)}
        </Line>
      ) : null}

      {rows.length > 0 ? (
        <Line label="Read">{describePassages(rows, index)}</Line>
      ) : comparison <= 0 ? (
        <p className="mt-4 text-body text-muted-foreground">
          {comparison < 0 ? "Not read" : "Not read yet"}
        </p>
      ) : null}

      {extras.length > 0 ? (
        <section
          aria-labelledby="friend-extra-readings-heading"
          className="mt-6"
        >
          <h2
            id="friend-extra-readings-heading"
            className="text-overline text-faint"
          >
            EXTRA READINGS
          </h2>
          <ul className="mt-2">
            {extras.map((row) => (
              <li key={row.id} className="min-h-11 py-2 text-body">
                {describeRow(row, index)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
