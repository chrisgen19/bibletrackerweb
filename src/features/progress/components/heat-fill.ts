import type { HeatLevel } from "../domain/reading-heatmap";

/** The heatmap ramp: muted for an unread day, deepening to the full brand colour. */
export const HEAT_FILL: Record<HeatLevel, string> = {
  0: "bg-muted",
  1: "bg-primary/35",
  2: "bg-primary/65",
  3: "bg-primary",
};
