"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";

import type { ReadingView } from "@/features/reading-plan/domain/reading-view";
import type { DateKey } from "@/utils/date-key";

type DayHref = (date: DateKey) => string;

const defaultDayHref: DayHref = (date) => `/day/${date}`;

interface ReadingViewContextValue {
  view: ReadingView;
  dayHref: DayHref;
}

const ReadingViewContext = createContext<ReadingViewContextValue | null>(null);

interface ReadingViewProviderProps {
  view: ReadingView;
  /** Where a day links to. Defaults to the reader's own day page. */
  dayHref?: DayHref;
  children: ReactNode;
}

/**
 * Hands the read-only reading data to the calendar, heatmap, streaks and journal hooks.
 * `ReadingDataProvider` provides the reader's own; a nested provider (a friend's profile)
 * shadows it for everything below, so the same screens render someone else's reading.
 */
export function ReadingViewProvider({
  view,
  dayHref = defaultDayHref,
  children,
}: ReadingViewProviderProps) {
  const value = useMemo(() => ({ view, dayHref }), [view, dayHref]);
  return (
    <ReadingViewContext.Provider value={value}>
      {children}
    </ReadingViewContext.Provider>
  );
}

export function useReadingView(): ReadingView {
  const value = useContext(ReadingViewContext);
  if (value === null) {
    throw new Error(
      "useReadingView must be used inside a ReadingViewProvider.",
    );
  }
  return value.view;
}

/**
 * The link for a day. Falls back to the reader's own `/day/<date>` outside a provider, so
 * a row that only links needs no view.
 */
export function useDayHref(): DayHref {
  return useContext(ReadingViewContext)?.dayHref ?? defaultDayHref;
}
