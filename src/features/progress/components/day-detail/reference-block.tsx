import type { BibleReference } from "@/data/bible/canon";
import type { CanonIndex } from "@/data/bible/canon-index";
import { formatReferenceSpan } from "@/features/reading-plan/domain/reference";

interface ReferenceBlockProps {
  /** Already upper case, as on iOS: SCHEDULED, RECORDED or READING. */
  label: string;
  chapters: readonly BibleReference[];
  index: CanonIndex;
}

/** The day's reading, named in a quiet panel. */
export function ReferenceBlock({
  label,
  chapters,
  index,
}: ReferenceBlockProps) {
  return (
    <div className="mt-5 rounded-xl bg-muted p-4">
      <p className="text-overline text-faint">{label}</p>
      <p className="mt-1 text-title">{formatReferenceSpan(chapters, index)}</p>
    </div>
  );
}
