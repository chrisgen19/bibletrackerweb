"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

/**
 * The day detail over the calendar, as iOS presents it in a form sheet: from the bottom
 * on a phone, from the right on a larger screen. Closing goes back, so the browser's
 * back button closes it too.
 */
export function DaySheet({ children }: { children: ReactNode }) {
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");

  return (
    <Sheet open onOpenChange={(open) => (open ? null : router.back())}>
      <SheetContent
        side={wide ? "right" : "bottom"}
        // The title lives in the day detail; it describes itself.
        aria-describedby={undefined}
        className={cn(
          "gap-0 overflow-y-auto bg-card px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          wide ? "w-full sm:max-w-md" : "max-h-[92dvh] rounded-t-3xl",
        )}
      >
        {wide ? null : (
          <span
            aria-hidden
            className="mx-auto -mt-3 mb-4 block h-1.5 w-9 shrink-0 rounded-full bg-border-strong"
          />
        )}
        {children}
      </SheetContent>
    </Sheet>
  );
}
