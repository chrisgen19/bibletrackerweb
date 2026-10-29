import type { DayReading } from "@/features/reading-plan/domain/types";
import type { DateKey } from "@/utils/date-key";

import type { CalendarCell, CalendarMonth } from "../domain/calendar-month";

/**
 * How one side of a completed day meets its neighbour.
 *
 * `cap` rounds the band off, `link` runs it flat into the next day, and `fade` trails it
 * off where the run carries on beyond this row or into the neighbouring month.
 */
export type ChainEdge = "cap" | "link" | "fade";

export interface ChainShape {
  readonly left: ChainEdge;
  readonly right: ChainEdge;
}

export const CHAIN_CIRCLE: ChainShape = { left: "cap", right: "cap" };

const DAYS_PER_WEEK = 7;

function edgeTo(
  neighbour: CalendarCell | undefined,
  neighbourRead: boolean,
  atRowEnd: boolean,
): ChainEdge {
  if (neighbour === undefined || !neighbourRead) return "cap";
  return atRowEnd || !neighbour.inCurrentMonth ? "fade" : "link";
}

/**
 * The chain band for every completed day in the grid: consecutive read days within a
 * week join into one band. Padding days from the neighbouring months stay single circles.
 */
export function getChainShapes(
  month: CalendarMonth,
  readings: ReadonlyMap<DateKey, DayReading>,
): ReadonlyMap<DateKey, ChainShape> {
  const cells = month.weeks.flat();
  const isRead = (cell: CalendarCell | undefined) =>
    cell !== undefined && readings.get(cell.date)?.status === "completed";

  const shapes = new Map<DateKey, ChainShape>();
  cells.forEach((cell, index) => {
    if (!isRead(cell)) return;
    if (!cell.inCurrentMonth) {
      shapes.set(cell.date, CHAIN_CIRCLE);
      return;
    }
    const before = cells[index - 1];
    const after = cells[index + 1];
    const column = index % DAYS_PER_WEEK;
    shapes.set(cell.date, {
      left: edgeTo(before, isRead(before), column === 0),
      right: edgeTo(after, isRead(after), column === DAYS_PER_WEEK - 1),
    });
  });
  return shapes;
}

/**
 * The same chain for the week strip. A run that carries on from the Saturday before, or
 * into the Sunday after, trails off at the strip's edge as a month row does.
 */
export function getWeekChainShapes(
  days: readonly DayReading[],
  neighbours: { readBefore: boolean; readAfter: boolean },
): readonly (ChainShape | undefined)[] {
  const isRead = (index: number) => days[index]?.status === "completed";
  return days.map((_, index) => {
    if (!isRead(index)) return undefined;
    const left: ChainEdge =
      index === 0
        ? neighbours.readBefore
          ? "fade"
          : "cap"
        : isRead(index - 1)
          ? "link"
          : "cap";
    const right: ChainEdge =
      index === days.length - 1
        ? neighbours.readAfter
          ? "fade"
          : "cap"
        : isRead(index + 1)
          ? "link"
          : "cap";
    return { left, right };
  });
}
