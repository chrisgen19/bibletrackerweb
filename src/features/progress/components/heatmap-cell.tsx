import type { KeyboardEvent } from "react";

import { cn } from "@/lib/utils";
import type { DateKey } from "@/utils/date-key";

import type { HeatCell } from "../domain/reading-heatmap";
import { describeHeatCell } from "./day-appearance";
import { HEAT_FILL } from "./heat-fill";

interface HeatmapCellProps {
  cell: HeatCell;
  isToday: boolean;
  isSelected: boolean;
  onActivate: (date: DateKey) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, date: DateKey) => void;
}

/**
 * One day in the heatmap. Too small to be a precise tap target on a phone, so a tap
 * finds the day in the journal below, whose rows are the full-size way in.
 */
export function HeatmapCell({
  cell,
  isToday,
  isSelected,
  onActivate,
  onKeyDown,
}: HeatmapCellProps) {
  if (cell.state === "future") {
    return <td className="p-0" />;
  }

  return (
    <td className="p-0">
      <button
        type="button"
        data-date={cell.date}
        tabIndex={isSelected ? 0 : -1}
        aria-label={describeHeatCell(cell, isToday)}
        aria-current={isToday ? "date" : undefined}
        onClick={() => onActivate(cell.date)}
        onKeyDown={(event) => onKeyDown(event, cell.date)}
        className={cn(
          "block aspect-square w-full rounded-[3px] outline-none transition-[outline-color] motion-reduce:transition-none",
          cell.state === "outside"
            ? "border border-border border-dashed"
            : HEAT_FILL[cell.level],
          isToday && "ring-[1.5px] ring-foreground/70 ring-inset",
          isSelected
            ? "outline-2 outline-primary outline-offset-1"
            : "hover:outline-1 hover:outline-border-strong hover:outline-offset-1",
          "focus-visible:outline-offset-2",
        )}
      />
    </td>
  );
}
