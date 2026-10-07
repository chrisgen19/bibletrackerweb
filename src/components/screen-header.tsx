import { ChevronLeft } from "lucide-react";
import Link from "next/link";

interface ScreenHeaderProps {
  title: string;
  backHref: string;
  /** The screen the link returns to, as an iOS back button names it. */
  backLabel: string;
}

/** A pushed screen's header: back to where it came from, then its large title. */
export function ScreenHeader({
  title,
  backHref,
  backLabel,
}: ScreenHeaderProps) {
  return (
    <header className="mb-6">
      <Link
        href={backHref}
        className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-callout text-primary outline-none hover:bg-primary-soft focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {backLabel}
      </Link>
      <h1 className="mt-1 text-large-title">{title}</h1>
    </header>
  );
}
