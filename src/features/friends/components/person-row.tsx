import Link from "next/link";
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
  /**
   * Makes the avatar and name one link to this page. The buttons stay outside it, so a tap
   * on them never navigates.
   */
  href?: string;
  /** A footnote line under `@username`, for rows with a name. */
  detail?: ReactNode;
}

const IDENTITY_LINK =
  "-m-2 flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl p-2 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-pressed";

/** A person: avatar, name and `@username`, or just the handle when nothing more is shown. */
export function PersonRow({
  username,
  name,
  image,
  error = null,
  children,
  stackActions = false,
  href,
  detail,
}: PersonRowProps) {
  const identity = (
    <>
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
        {detail === undefined ? null : (
          <span className="block truncate text-footnote">{detail}</span>
        )}
      </span>
    </>
  );
  return (
    <div className="@container px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        {href === undefined ? (
          <span className="flex min-w-0 flex-1 items-center gap-3">
            {identity}
          </span>
        ) : (
          <Link href={href} className={IDENTITY_LINK}>
            {identity}
          </Link>
        )}
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
