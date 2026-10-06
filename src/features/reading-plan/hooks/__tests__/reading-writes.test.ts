// Review on #7: what happens to the screen when the server refuses a write. Runs the real
// write options against TanStack Query's core observers, with the server faked.
import {
  MutationObserver,
  QueryClient,
  QueryObserver,
} from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ReadingResult } from "@/features/reading-plan/commands/results";
import type { ReadingPlan } from "@/features/reading-plan/domain/types";
import type { ReadingSnapshot } from "@/lib/dal";

import {
  type Command,
  READING_SNAPSHOT_KEY,
  readingWriteOptions,
} from "../reading-writes";

const plan: ReadingPlan = {
  id: "plan-1",
  canonId: "protestant",
  startDate: "2026-08-01",
  startBookId: "GEN",
  startChapter: 1,
  chaptersPerDay: 1,
  createdAt: 0,
  isActive: true,
  endDate: null,
};
const withPlan: ReadingSnapshot = {
  plans: [plan],
  activePlan: plan,
  completions: [],
};
const empty: ReadingSnapshot = { plans: [], activePlan: null, completions: [] };

/** A marker write: adds a completion whose id names it, so tests can see it. */
function marker(id: string) {
  return (snapshot: ReadingSnapshot): ReadingSnapshot => ({
    ...snapshot,
    completions: [
      ...snapshot.completions,
      {
        id,
        readingPlanId: "plan-1",
        localDate: "2026-08-02",
        bookId: "GEN",
        chapter: 2,
        verses: null,
        completedAt: 0,
      },
    ],
  });
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

let cleanup: () => void = () => {};
afterEach(() => cleanup());

/** A client showing `initial`, whose server now holds `server`. */
function setup(initial: ReadingSnapshot, server: { current: ReadingSnapshot }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(READING_SNAPSHOT_KEY, initial);
  const queryFn = vi.fn(async () => server.current);
  // An active observer, as the provider's useQuery is, so invalidation refetches.
  const observer = new QueryObserver(queryClient, {
    queryKey: READING_SNAPSHOT_KEY,
    queryFn,
    staleTime: 0,
    refetchOnMount: false,
  });
  const unsubscribe = observer.subscribe(() => {});
  const errors: unknown[] = [];
  const options = readingWriteOptions(queryClient, (error) =>
    errors.push(error),
  );
  const write = (command: Command) =>
    new MutationObserver(queryClient, options).mutate(command);
  const shown = () =>
    queryClient.getQueryData<ReadingSnapshot>(READING_SNAPSHOT_KEY);
  const settled = () =>
    vi.waitFor(() => {
      expect(queryClient.isMutating()).toBe(0);
      expect(queryClient.isFetching()).toBe(0);
    });
  cleanup = () => {
    unsubscribe();
    queryClient.clear();
  };
  return { write, shown, settled, errors, queryFn };
}

const refused = (error: "no-plan" | "future-date"): ReadingResult => ({
  ok: false,
  error,
});

describe("when the server refuses a write", () => {
  it("ends on the server's state, not the stale one from before the write", async () => {
    // Another device reset progress; this tab still shows the plan and tries to log.
    const server = { current: empty };
    const { write, shown, settled, errors } = setup(withPlan, server);

    await write({
      optimistic: marker("a"),
      run: async () => refused("no-plan"),
    });
    await settled();

    expect(errors).toContain("no-plan");
    expect(shown()).toEqual(empty);
  });

  it("does not throw away another write that is still on its way", async () => {
    const server = { current: withPlan };
    const { write, shown, settled } = setup(withPlan, server);
    const second = deferred<ReadingResult>();

    const first = write({
      optimistic: marker("a"),
      run: async () => refused("future-date"),
    });
    const pendingSecond = write({
      optimistic: marker("b"),
      run: () => second.promise,
    });
    await first;

    // The refused write is gone; the one still waiting is still on screen.
    expect(shown()?.completions.map((row) => row.id)).toContain("b");

    const stored = marker("b")(withPlan);
    server.current = stored;
    second.resolve({ ok: true, snapshot: stored });
    await pendingSecond;
    await settled();
    expect(shown()).toEqual(stored);
  });

  it("does not restore a snapshot older than one the server already sent", async () => {
    // The first write succeeds; the second is refused after it. The server's copy of the
    // first carries its own timestamp, so it differs from the optimistic one.
    const optimisticFirst = marker("a")(withPlan);
    const afterFirst: ReadingSnapshot = {
      ...optimisticFirst,
      completions: optimisticFirst.completions.map((row) => ({
        ...row,
        completedAt: 1_754_000_000_000,
      })),
    };
    const server = { current: afterFirst };
    const { write, shown, settled } = setup(withPlan, server);

    const first = write({
      optimistic: marker("a"),
      run: async () => ({ ok: true, snapshot: afterFirst }),
    });
    const second = write({
      optimistic: marker("b"),
      run: async () => refused("future-date"),
    });
    await Promise.all([first, second]);
    await settled();

    expect(shown()).toEqual(afterFirst);
  });
});
