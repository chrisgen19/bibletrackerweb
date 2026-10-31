import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Avatar } from "./avatar";

interface PersonRowProps {
  username: string;
  /** Absent for a handle-only row (search results, Sent). */
  name?: string;
  image?: string | null;
  /** Inline failure copy from the row's last action. */
  error?: string | null;
  /** The row's buttons, kept on the right. */
  children?: ReactNode;
  /**
   * Moves the buttons under the name when the row is narrow, so two buttons never squeeze
   * the name down to a few letters. For rows with a name (the indent lines up with it).
   */
  stackActions?: boolean;
}

/** A person: avatar, name and `@username`, or just the handle when nothing more is shown. */
export function PersonRow({
  username,
  name,
  image,
  error = null,
  children,
  stackActions = false,
}: PersonRowProps) {
  return (
    <div className="@container px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        {name === undefined ? null : <Avatar name={name} image={image} />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-headline">
            {name ?? `@${username}`}
          </span>
          {name === undefined ? null : (
            <span className="block truncate text-footnote text-muted-foreground">
              @{username}
            </span>
          )}
        </span>
        {children === undefined ? null : (
          <span
            className={cn(
              "flex shrink-0 items-center gap-2",
              // Below 22rem: a full-width line, indented past the avatar (size-10 + gap-3).
              stackActions &&
                "@max-[22rem]:w-full @max-[22rem]:pl-13 @max-[22rem]:*:flex-1",
            )}
          >
            {children}
          </span>
        )}
      </div>
      {error === null ? null : (
        <p role="alert" className="mt-2 text-footnote text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
