import { format } from "date-fns";

import { formatReferenceSpan } from "@/features/reading-plan/domain/reference";
import type {
  DayReading,
  ReadingStatus,
} from "@/features/reading-plan/domain/types";
import { fromDateKey } from "@/utils/date-key";

export interface DayAppearance {
  /** Circle fill behind the numeral, if any. Completed days bloom a fill of their own. */
  fill: "none" | "muted";
  /** Marks today with an outline. */
  ring: boolean;
  /** Numeral colour and weight. */
  text: "primary" | "on-primary" | "secondary" | "tertiary";
  weight: "medium" | "semibold";
  opacity: number;
}

/**
 * Maps a reading status to its calendar treatment (bibletrackerapp's getDayAppearance,
 * returning roles instead of colours so the classes can follow light and dark).
 *
 * Missed days get a soft neutral fill rather than a warning colour: the product should
 * encourage consistency, not scold. Completed days rely on a solid accent circle alone:
 * at this density an extra check badge reads as clutter, and the filled state is already
 * unambiguous.
 */
export function getDayAppearance(
  status: ReadingStatus,
  options: { isToday: boolean; inCurrentMonth: boolean },
): DayAppearance {
  const base: DayAppearance = {
    fill: "none",
    ring: false,
    text: "secondary",
    weight: "medium",
    opacity: options.inCurrentMonth ? 1 : 0.28,
  };
  const todayRing = { ring: options.isToday };

  switch (status) {
    case "completed":
      return { ...base, ...todayRing, text: "on-primary", weight: "semibold" };
    case "today-pending":
      return { ...base, ring: true, text: "primary", weight: "semibold" };
    case "missed":
      return { ...base, fill: "muted", text: "tertiary" };
    case "upcoming":
      return { ...base, ...todayRing, text: "tertiary" };
    case "before-plan":
    case "canon-complete":
    case "no-plan":
      return {
        ...base,
        ...todayRing,
        text: "tertiary",
        opacity: options.inCurrentMonth ? 0.5 : 0.24,
      };
  }
}

const STATUS_DESCRIPTION: Record<ReadingStatus, string> = {
  completed: "completed",
  "today-pending": "not read yet",
  missed: "not read",
  upcoming: "scheduled",
  "before-plan": "before your plan began",
  "canon-complete": "plan finished",
  "no-plan": "no reading scheduled",
};

/** "Monday 24 August, Genesis 24, completed" */
export function describeDay(day: DayReading, isToday: boolean): string {
  const datePart = format(fromDateKey(day.date), "EEEE d MMMM");
  const prefix = isToday ? `Today, ${datePart}` : datePart;

  const reference =
    day.scheduled.kind === "scheduled"
      ? formatReferenceSpan(day.scheduled.chapters)
      : null;

  return [prefix, reference, STATUS_DESCRIPTION[day.status]]
    .filter((part) => part !== null)
    .join(", ");
}
