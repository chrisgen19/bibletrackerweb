import type { MutationOptions, QueryClient } from "@tanstack/react-query";

import type {
  ReadingErrorCode,
  ReadingResult,
} from "@/features/reading-plan/commands/results";
import type { ReadingSnapshot } from "@/lib/dal";

export const READING_SNAPSHOT_KEY = ["reading-snapshot"] as const;

/** A write: what it should look like at once, and the Server Action that does it. */
export interface Command {
  readonly optimistic: (snapshot: ReadingSnapshot) => ReadingSnapshot;
  readonly run: () => Promise<ReadingResult>;
}

/**
 * How every reading write runs, kept out of the component so it can be tested with
 * TanStack Query alone.
 *
 * Writes run one at a time (`scope`), but each shows on screen as soon as it is made.
 * When the server refuses one, the screen is not rolled back to the snapshot from before
 * it: later writes may have been applied on top since, and the server may have moved on
 * (another device reset progress). It is reconciled with the server instead. If another
 * write is still waiting, its answer carries the server's whole snapshot, which replaces
 * everything; if this was the last one, the snapshot is refetched.
 *
 * @param report receives the error to show, or null when a new write starts.
 */
export function readingWriteOptions(
  queryClient: QueryClient,
  report: (error: ReadingErrorCode | null) => void,
): MutationOptions<ReadingResult, Error, Command> {
  return {
    scope: { id: "reading-writes" },
    mutationFn: async (command) => {
      try {
        return await command.run();
      } catch {
        return { ok: false, error: "network" };
      }
    },
    onMutate: async (command) => {
      await queryClient.cancelQueries({ queryKey: READING_SNAPSHOT_KEY });
      const current =
        queryClient.getQueryData<ReadingSnapshot>(READING_SNAPSHOT_KEY);
      if (current !== undefined) {
        queryClient.setQueryData(
          READING_SNAPSHOT_KEY,
          command.optimistic(current),
        );
      }
      report(null);
    },
    onSuccess: async (result) => {
      if (result.ok) {
        queryClient.setQueryData(READING_SNAPSHOT_KEY, result.snapshot);
        return;
      }
      report(result.error);
      // This write still counts as in flight during its own onSuccess.
      if (queryClient.isMutating() <= 1) {
        await queryClient.invalidateQueries({ queryKey: READING_SNAPSHOT_KEY });
      }
    },
  };
}
