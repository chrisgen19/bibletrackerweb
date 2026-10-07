import { LoaderCircle } from "lucide-react";

/** Between screens, as bibletrackerapp's loading screen: a quiet spinner and nothing else. */
export default function Loading() {
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <output aria-live="polite">
        <LoaderCircle
          className="size-6 animate-spin text-faint motion-reduce:animate-none"
          aria-hidden
        />
        <span className="sr-only">Loading</span>
      </output>
    </main>
  );
}
