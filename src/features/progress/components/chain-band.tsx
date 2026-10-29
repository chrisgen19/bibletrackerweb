import { cn } from "@/lib/utils";

import type { ChainEdge, ChainShape } from "./chain-shape";

// Half the 36px day circle (or pill) either side of the centre, so a capped band is that
// shape. The radius is exact rather than `full` so it eases in step when a cap becomes a
// link.
const LEFT_EDGE: Record<ChainEdge, string> = {
  cap: "left-[calc(50%-18px)] rounded-l-[18px]",
  // A pixel of overlap hides the hairline seam fractional column widths leave behind.
  link: "-left-px",
  fade: "left-0",
};

const RIGHT_EDGE: Record<ChainEdge, string> = {
  cap: "right-[calc(50%-18px)] rounded-r-[18px]",
  link: "-right-px",
  fade: "right-0",
};

const FADE_LENGTH = "12px";

/** A soft trailing end where the run carries on past this row or month. */
function fadeMask(shape: ChainShape): string | undefined {
  if (shape.left !== "fade" && shape.right !== "fade") return undefined;
  const start =
    shape.left === "fade" ? `transparent 0, black ${FADE_LENGTH}` : "black 0";
  const end =
    shape.right === "fade"
      ? `black calc(100% - ${FADE_LENGTH}), transparent 100%`
      : "black 100%";
  return `linear-gradient(to right, ${start}, ${end})`;
}

interface ChainBandProps {
  shape: ChainShape;
  visible: boolean;
  opacity: number;
  /** Vertical extent: the month grid insets it to a circle, the strip runs it full height. */
  className?: string;
}

/**
 * The accent band behind a read day. Always mounted, so marking a day blooms its circle
 * and stretches the neighbours' ends across to meet it rather than snapping.
 */
export function ChainBand({
  shape,
  visible,
  opacity,
  className,
}: ChainBandProps) {
  const mask = fadeMask(shape);
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute bg-primary transition-[left,right,opacity,scale] duration-[240ms] ease-out motion-reduce:transition-none",
        LEFT_EDGE[shape.left],
        RIGHT_EDGE[shape.right],
        visible ? "scale-100" : "scale-[0.72]",
        className,
      )}
      style={{
        opacity: visible ? opacity : 0,
        maskImage: mask,
        WebkitMaskImage: mask,
      }}
    />
  );
}
