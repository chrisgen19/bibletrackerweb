"use client";

import { Button } from "@/components/ui/button";
import { useReadingData } from "@/features/reading-plan/hooks/reading-data-provider";
import { cn } from "@/lib/utils";

/**
 * What the network adds to the iOS app: a save still on its way, and a save the server
 * refused. Pinned to the bottom of every screen, since any of them can write.
 */
export function WriteStatus() {
  const { error, dismissError, isSaving } = useReadingData();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {error === null ? null : (
        <div
          role="alert"
          className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border bg-card py-2 pr-2 pl-4 text-callout shadow-raised"
        >
          <span className="flex-1">{error}</span>
          <Button variant="plain" onClick={dismissError}>
            Dismiss
          </Button>
        </div>
      )}
      <p
        aria-live="polite"
        data-testid="saving"
        className={cn(
          "rounded-full bg-foreground/85 px-3 py-1 text-footnote text-background",
          !isSaving && "sr-only",
        )}
      >
        {isSaving ? "Saving..." : ""}
      </p>
    </div>
  );
}
