interface ProgressRingProps {
  /** 0 to 100. */
  percent: number;
  size?: number;
  strokeWidth?: number;
  /** Hidden when the month has nothing to report, e.g. before the plan began. */
  showLabel?: boolean;
  label?: string;
}

/**
 * Circular completion meter for the monthly summary. The sweep eases to a new value, so
 * a freshly marked reading visibly moves it, and holds still under reduced motion.
 */
export function ProgressRing({
  percent,
  size = 56,
  strokeWidth = 5,
  showLabel = true,
  label,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const rounded = Math.round(clamped);

  return (
    <div
      role="progressbar"
      aria-label={label ?? `${rounded} percent complete`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={rounded}
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          className="stroke-primary transition-[stroke-dashoffset] duration-[340ms] ease-out motion-reduce:transition-none"
        />
      </svg>
      {showLabel ? (
        <span className="text-footnote text-muted-foreground">{rounded}%</span>
      ) : null}
    </div>
  );
}
