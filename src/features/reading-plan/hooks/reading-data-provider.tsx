"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import * as actions from "@/actions/reading";
import type { BibleReference, VerseRange } from "@/data/bible/canon";
import {
  planForReading,
  withChangedPlan,
  withCompletedReading,
  withoutDay,
  withoutEntry,
  withReset,
  withStartedPlan,
} from "@/features/reading-plan/commands/optimistic";
import {
  type ReadingErrorCode,
  readingErrorMessage,
} from "@/features/reading-plan/commands/results";
import {
  type CompletionLookup,
  createCompletionLookup,
  createScheduleContext,
  type ScheduleContext,
} from "@/features/reading-plan/domain/schedule";
import type {
  ReadingCompletion,
  ReadingPlan,
  ReadingPlanDraft,
} from "@/features/reading-plan/domain/types";
import type { ReadingSnapshot } from "@/lib/dal";
import { compareDateKeys, type DateKey } from "@/utils/date-key";
import { createId } from "@/utils/id";

import { READING_SNAPSHOT_KEY, readingWriteOptions } from "./reading-writes";
import { useLocalToday } from "./use-local-today";

/**
 * The same shape as bibletrackerapp's ReadingDataValue, so the ported hooks and screens
 * work unchanged, plus what a network adds: an error to show and a saving flag.
 */
interface ReadingDataValue {
  plans: readonly ReadingPlan[];
  activePlan: ReadingPlan | null;
  completions: readonly ReadingCompletion[];
  completionLookup: CompletionLookup;
  scheduleContext: ScheduleContext;
  today: DateKey;
  /** The presence of an active plan is the onboarding marker, as on iOS. */
  hasCompletedOnboarding: boolean;
  startPlan: (draft: ReadingPlanDraft) => void;
  changePlan: (draft: ReadingPlanDraft) => void;
  /**
   * Shows the reading at once and saves it in the background. Returns false, without
   * writing anything, when the server would refuse it: no plan to attach it to, a future
   * day, or no chapters. If the server refuses it later, the screen is reconciled with
   * the server's state and the reason is reported in `error`.
   */
  completeReading: (
    date: DateKey,
    chapters: readonly BibleReference[],
    verses?: VerseRange,
  ) => boolean;
  undoReading: (date: DateKey) => void;
  undoReadingEntry: (id: string) => void;
  resetProgress: () => void;
  /** Plain copy for the last failed save, or null. */
  error: string | null;
  dismissError: () => void;
  isSaving: boolean;
}

const ReadingDataContext = createContext<ReadingDataValue | null>(null);

async function fetchSnapshot(): Promise<ReadingSnapshot> {
  const response = await fetch("/api/reading/snapshot", { cache: "no-store" });
  if (!response.ok)
    throw new Error(`Snapshot request failed: ${response.status}`);
  return (await response.json()) as ReadingSnapshot;
}

interface ReadingDataProviderProps {
  initialSnapshot: ReadingSnapshot;
  initialToday: DateKey;
  initialTimeZone: string;
  /** Whether `initialTimeZone` came from this device's own cookie. */
  initialTimeZoneFromDevice: boolean;
  children: ReactNode;
}

/**
 * Single source of reading state for the UI, as on iOS.
 *
 * The server stays the source of truth: every write returns the whole snapshot, which
 * replaces the optimistic one. The snapshot is also refetched when the window regains
 * focus, so a reading logged on another device shows up.
 *
 * Offline, a write is not lost: TanStack Query pauses it and Next.js replays a Server
 * Action once the connection returns, so the optimistic state stays on screen (with
 * `isSaving` true) until it is stored. A write the server refuses is replaced by the
 * server's state (see reading-writes.ts).
 */
export function ReadingDataProvider({
  initialSnapshot,
  initialToday,
  initialTimeZone,
  initialTimeZoneFromDevice,
  children,
}: ReadingDataProviderProps) {
  const queryClient = useQueryClient();
  const { today, timeZone } = useLocalToday(
    initialToday,
    initialTimeZone,
    initialTimeZoneFromDevice,
  );
  const [errorCode, setErrorCode] = useState<ReadingErrorCode | null>(null);

  const { data: snapshot } = useQuery({
    queryKey: READING_SNAPSHOT_KEY,
    queryFn: fetchSnapshot,
    initialData: initialSnapshot,
    // Always stale, so every return to the tab refetches: a reading logged on another
    // device a moment ago must show up. The server already rendered the first snapshot,
    // so mounting does not fetch it again.
    staleTime: 0,
    refetchOnMount: false,
    // Not while a write is pending: the server's snapshot would not have it yet, and the
    // reading would vanish until the write landed.
    refetchOnWindowFocus: () => queryClient.isMutating() === 0,
  });

  const { mutate, isPending } = useMutation(
    readingWriteOptions(queryClient, setErrorCode),
  );

  const current = useCallback(
    () =>
      queryClient.getQueryData<ReadingSnapshot>(READING_SNAPSHOT_KEY) ??
      snapshot,
    [queryClient, snapshot],
  );

  const startPlan = useCallback(
    (draft: ReadingPlanDraft) => {
      const created = { id: createId(), createdAt: Date.now() };
      mutate({
        optimistic: (s) => withStartedPlan(s, draft, created),
        run: () => actions.startPlan({ draft }),
      });
    },
    [mutate],
  );

  const changePlan = useCallback(
    (draft: ReadingPlanDraft) => {
      const created = { id: createId(), createdAt: Date.now() };
      mutate({
        optimistic: (s) => withChangedPlan(s, draft, created),
        run: () => actions.changePlan({ draft, timeZone }),
      });
    },
    [mutate, timeZone],
  );

  const completeReading = useCallback(
    (
      date: DateKey,
      chapters: readonly BibleReference[],
      verses?: VerseRange,
    ) => {
      if (chapters.length === 0) return false;
      if (compareDateKeys(date, today) > 0) return false;
      if (planForReading(current(), date) === null) return false;

      const reading = {
        date,
        chapters: [...chapters],
        verses,
        ids: chapters.map(() => createId()),
        completedAt: Date.now(),
      };
      mutate({
        optimistic: (s) => withCompletedReading(s, reading),
        run: () =>
          actions.completeReading({
            date,
            chapters: reading.chapters,
            verses,
            ids: reading.ids,
            timeZone,
          }),
      });
      return true;
    },
    [mutate, current, today, timeZone],
  );

  const undoReading = useCallback(
    (date: DateKey) =>
      mutate({
        optimistic: (s) => withoutDay(s, date),
        run: () => actions.undoReading({ date }),
      }),
    [mutate],
  );

  const undoReadingEntry = useCallback(
    (id: string) =>
      mutate({
        optimistic: (s) => withoutEntry(s, id),
        run: () => actions.undoReadingEntry({ id }),
      }),
    [mutate],
  );

  const resetProgress = useCallback(
    () => mutate({ optimistic: withReset, run: () => actions.resetProgress() }),
    [mutate],
  );

  const dismissError = useCallback(() => setErrorCode(null), []);

  const value = useMemo<ReadingDataValue>(
    () => ({
      plans: snapshot.plans,
      activePlan: snapshot.activePlan,
      completions: snapshot.completions,
      completionLookup: createCompletionLookup(snapshot.completions),
      scheduleContext: createScheduleContext(
        snapshot.plans,
        snapshot.completions,
        today,
      ),
      today,
      hasCompletedOnboarding: snapshot.activePlan !== null,
      startPlan,
      changePlan,
      completeReading,
      undoReading,
      undoReadingEntry,
      resetProgress,
      error: errorCode === null ? null : readingErrorMessage(errorCode),
      dismissError,
      isSaving: isPending,
    }),
    [
      snapshot,
      today,
      startPlan,
      changePlan,
      completeReading,
      undoReading,
      undoReadingEntry,
      resetProgress,
      errorCode,
      dismissError,
      isPending,
    ],
  );

  return (
    <ReadingDataContext.Provider value={value}>
      {children}
    </ReadingDataContext.Provider>
  );
}

export function useReadingData(): ReadingDataValue {
  const value = useContext(ReadingDataContext);
  if (value === null) {
    throw new Error(
      "useReadingData must be used inside a ReadingDataProvider.",
    );
  }
  return value;
}
