import { CircleCheck } from "lucide-react";

import type { ReadTodayStatus } from "@/features/friends/domain/types";

/**
 * Whether a friend has read today, as text so it never rests on colour alone. A friend
 * with no plan has nothing to read, so they get no mark rather than a "not yet" nag.
 */
export function ReadTodayMark({ status }: { status: ReadTodayStatus }) {
  if (status === "no-plan") return null;
  if (status === "read") {
    return (
      <span className="inline-flex items-center gap-1 text-primary">
        <CircleCheck className="size-3.5 shrink-0" aria-hidden />
        Read today
      </span>
    );
  }
  return <span className="text-muted-foreground">Not yet today</span>;
}
