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

/** Every reading write carries this key, so screens can wait for them to settle. */
export const READING_WRITE_KEY = ["reading-write"] as const;

/** The writes still waiting for an answer, oldest first, apart from `except`. */
function waitingWrites(queryClient: QueryClient, except: Command): Command[] {
  return queryClient
    .getMutationCache()
    .findAll({ mutationKey: READING_WRITE_KEY, status: "pending" })
    .map((mutation) => mutation.state.variables as Command)
    .filter((command) => command !== except);
}

/**
 * How every reading write runs, kept out of the component so it can be tested with
 * TanStack Query alone. Create it once per client: the writes share what the server
 * last sent.
 *
 * Writes run one at a time (`scope`), but each shows on screen as soon as it is made.
 * What is shown is always the server's last snapshot with the writes still waiting
 * applied on top, in order. Each answer rebuilds it from that: from the new snapshot if
 * the server stored the write, from the previous one if it refused it. So an answer
 * never hides a later write, and a refused change disappears at once without undoing
 * anything else. A refusal with nothing else waiting also refetches the snapshot, since
 * the server may have moved on (another device reset progress).
 *
 * @param report receives the error to show, or null when a new write starts.
 */
export function readingWriteOptions(
  queryClient: QueryClient,
  report: (error: ReadingErrorCode | null) => void,
): MutationOptions<ReadingResult, Error, Command> {
  // The server's last snapshot. While no write is waiting, it is exactly what is shown.
  let fromServer: ReadingSnapshot | undefined;

  return {
    mutationKey: READING_WRITE_KEY,
    scope: { id: "reading-writes" },
    mutationFn: async (command) => {
      try {
        return await command.run();
      } catch {
        return { ok: false, error: "network" };
      }
    },
    onMutate: async (command) => {
      // Checked before the await: writes made together (a double click) both pause there.
      if (waitingWrites(queryClient, command).length === 0) {
        fromServer = queryClient.getQueryData(READING_SNAPSHOT_KEY);
      }
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
    onSuccess: async (result, command) => {
      // TanStack still counts this write as pending here, so it is left out by hand.
      const waiting = waitingWrites(queryClient, command);
      if (result.ok) fromServer = result.snapshot;
      else report(result.error);
      if (fromServer !== undefined) {
        queryClient.setQueryData(
          READING_SNAPSHOT_KEY,
          waiting.reduce((shown, next) => next.optimistic(shown), fromServer),
        );
      }
      if (!result.ok && waiting.length === 0) {
        await queryClient.invalidateQueries({ queryKey: READING_SNAPSHOT_KEY });
      }
    },
  };
}
