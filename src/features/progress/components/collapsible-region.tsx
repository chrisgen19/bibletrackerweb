import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface CollapsibleRegionProps {
  open: boolean;
  /**
   * Overrides `open` from desktop width, in CSS, for a first paint that has to match a
   * width the server cannot see. Script takes over once it knows the width.
   */
  openFromLg?: boolean;
  id?: string;
  children: ReactNode;
}

/**
 * Grows to its content's height and shrinks to nothing, by animating the grid row
 * between 0fr and 1fr: no measuring, and the height follows the content as it changes.
 * A closed region is inert, so its controls drop out of the tab order.
 */
export function CollapsibleRegion({
  open,
  openFromLg,
  id,
  children,
}: CollapsibleRegionProps) {
  return (
    <div
      id={id}
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        openFromLg === true && "lg:grid-rows-[1fr] lg:opacity-100",
        openFromLg === false && "lg:grid-rows-[0fr] lg:opacity-0",
      )}
    >
      {/* Side padding, cancelled by the margin, keeps focus rings clear of the clip. */}
      <div className="-mx-1 min-h-0 overflow-hidden px-1">{children}</div>
    </div>
  );
}
