import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  /** Right-aligned control, e.g. a month navigator or an action link. */
  accessory?: ReactNode;
  /** For `aria-labelledby` on the section it heads. */
  id?: string;
}

/** A section's eyebrow heading, upper case and quiet, as on iOS. */
export function SectionHeader({ title, accessory, id }: SectionHeaderProps) {
  return (
    <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
      <h2 id={id} className="text-overline text-faint uppercase">
        {title}
      </h2>
      {accessory}
    </div>
  );
}
