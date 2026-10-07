"use client";

import "./globals.css";

/**
 * The last resort, when the root layout itself fails. It replaces the whole document, so
 * it brings its own <html> and stylesheet, and follows the system appearance: the
 * reader's cookie is read by the layout that just failed.
 */
export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en" data-appearance="system">
      <body className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center text-foreground antialiased">
        <title>Something went wrong | Bible Daily</title>
        <p className="text-headline">Something went wrong</p>
        <p className="mt-2 max-w-[300px] text-callout text-muted-foreground">
          Bible Daily couldn&apos;t start. Trying again usually fixes it.
        </p>
        <button
          type="button"
          onClick={retry}
          className="mt-5 h-11 rounded-xl bg-secondary px-6 text-headline text-secondary-foreground"
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
