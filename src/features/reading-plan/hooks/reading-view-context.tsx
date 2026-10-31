"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";

import type {
  ReadingPerspective,
  ReadingView,
} from "@/features/reading-plan/domain/reading-view";
import type { DateKey } from "@/utils/date-key";

type DayHref = (date: DateKey) => string;

const defaultDayHref: DayHref = (date) => `/day/${date}`;

interface ReadingViewContextValue {
  view: ReadingView;
  dayHref: DayHref;
  perspective: ReadingPerspective;
}

const ReadingViewContext = createContext<ReadingViewContextValue | null>(null);

interface ReadingViewProviderProps {
  view: ReadingView;
  /** Where a day links to. Defaults to the reader's own day page. */
  dayHref?: DayHref;
  /** Whose reading this is, for copy. Defaults to the reader's own. */
  perspective?: ReadingPerspective;
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
  perspective = "self",
  children,
}: ReadingViewProviderProps) {
  const value = useMemo(
    () => ({ view, dayHref, perspective }),
    [view, dayHref, perspective],
  );
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

/**
 * Whether copy should speak to the reader or about a friend. `"self"` outside a provider,
 * so a component that only words a label needs no view.
 */
export function useReadingPerspective(): ReadingPerspective {
  return useContext(ReadingViewContext)?.perspective ?? "self";
}
