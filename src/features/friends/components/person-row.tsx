import type { ReactNode } from "react";

interface PersonRowProps {
  username: string;
  /** Absent for a handle-only row (search results, Sent). */
  name?: string;
  image?: string | null;
  /** Inline failure copy from the row's last action. */
  error?: string | null;
  /** The row's buttons, kept on the right. */
  children?: ReactNode;
}

/** A person: avatar, name and `@username`, or just the handle when nothing more is shown. */
export function PersonRow({
  username,
  name,
  image,
  error = null,
  children,
}: PersonRowProps) {
  const initial = (name ?? username).trim().charAt(0).toUpperCase();
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        {name === undefined ? null : (
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-headline text-primary"
          >
            {image ? (
              // biome-ignore lint/performance/noImgElement: a remote avatar of unknown host
              <img src={image} alt="" className="size-full object-cover" />
            ) : (
              initial
            )}
          </span>
        )}
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
          <span className="flex shrink-0 items-center gap-2">{children}</span>
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
