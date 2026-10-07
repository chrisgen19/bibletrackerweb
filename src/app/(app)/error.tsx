"use client";

import { Book } from "lucide-react";

import { EmptyState } from "@/components/empty-state";

/**
 * A screen that failed to load or render: bibletrackerapp's database failure screen,
 * reworded for a server instead of on-device storage. Retrying re-renders the screen.
 */
export default function AppError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <EmptyState
        icon={Book}
        title="We couldn't load your reading"
        description="Something went wrong reaching the server. Trying again usually fixes it."
        action={{ label: "Try Again", onClick: retry }}
      />
    </main>
  );
}
