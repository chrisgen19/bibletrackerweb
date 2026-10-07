import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface FieldRowProps {
  label: string;
  value: string;
  /** Navigates instead of acting. */
  href?: string;
  onClick?: () => void;
  /** Hides the separator on the last row of a group. */
  last?: boolean;
  /** Marks a row whose picker is open, for assistive technology. */
  expanded?: boolean;
  testId?: string;
}

/** iOS-style disclosure row used by the plan editors and settings. */
export function FieldRow({
  label,
  value,
  href,
  onClick,
  last = false,
  expanded,
  testId,
}: FieldRowProps) {
  // Read as "Book, Genesis", as on iOS: the two spans alone would run together.
  const name = `${label}, ${value}`;
  const className =
    "relative flex min-h-[50px] w-full items-center gap-2 px-4 text-left text-body outline-none transition-colors hover:bg-muted focus-visible:bg-muted active:bg-pressed";
  const content = (
    <>
      {/* The label stays on one line; a long value wraps beside it rather than lose words. */}
      <span className="flex-1 whitespace-nowrap">{label}</span>
      <span className="min-w-0 py-2 text-right text-muted-foreground">
        {value}
      </span>
      <ChevronRight className="size-3.5 shrink-0 text-faint" aria-hidden />
      {last ? null : (
        <span
          aria-hidden
          className="absolute right-0 bottom-0 left-4 h-px bg-border"
        />
      )}
    </>
  );

  if (href !== undefined) {
    return (
      <Link
        href={href}
        aria-label={name}
        className={className}
        data-testid={testId}
      >
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={name}
      aria-expanded={expanded}
      className={className}
      data-testid={testId}
    >
      {content}
    </button>
  );
}
