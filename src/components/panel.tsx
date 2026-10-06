import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

interface PanelProps extends ComponentProps<"div"> {
  /** `plain` sits flat on the background; `raised` carries the card shadow (light only). */
  variant?: "plain" | "raised";
  padded?: boolean;
}

/** bibletrackerapp's Card: a surface on the page background. */
export function Panel({
  variant = "plain",
  padded = true,
  className,
  ...props
}: PanelProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card text-card-foreground",
        padded && "p-5",
        variant === "raised" && "shadow-card",
        className,
      )}
      {...props}
    />
  );
}
