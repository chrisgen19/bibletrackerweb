"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

import { DEFAULT_CANON_ID, getCanonIndex } from "@/data/bible/canon-index";
import { buildReadingPlanDraft } from "@/features/reading-plan/domain/plan-draft";
import type {
  ReadingPlanDraft,
  StartMode,
} from "@/features/reading-plan/domain/types";
import type { DateKey } from "@/utils/date-key";

import { useReadingData } from "./reading-data-provider";

interface OnboardingState {
  mode: StartMode;
  bookId: string;
  chapter: number;
  /** Null until chosen: "today", which the browser may correct after loading. */
  chosenStartDate: DateKey | null;
}

interface OnboardingContextValue {
  mode: StartMode;
  bookId: string;
  chapter: number;
  startDate: DateKey;
  canonId: string;
  setMode: (mode: StartMode) => void;
  setPosition: (position: {
    bookId: string;
    chapter: number;
    startDate: DateKey;
  }) => void;
  /** The normalised draft that will be stored. */
  draft: ReadingPlanDraft;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/** New plans use the default canon, as on iOS. */
const canonId = DEFAULT_CANON_ID;

/** Carries the in-progress choices across the onboarding steps, as on iOS. */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { today } = useReadingData();
  const [state, setState] = useState<OnboardingState>(() => {
    const first = getCanonIndex(canonId).firstReference;
    return {
      mode: "genesis",
      bookId: first.bookId,
      chapter: first.chapter,
      chosenStartDate: null,
    };
  });

  const value = useMemo<OnboardingContextValue>(() => {
    const startDate = state.chosenStartDate ?? today;
    return {
      mode: state.mode,
      bookId: state.bookId,
      chapter: state.chapter,
      startDate,
      canonId,
      setMode: (mode) => setState((current) => ({ ...current, mode })),
      setPosition: ({ bookId, chapter, startDate: chosen }) =>
        setState((current) => ({
          ...current,
          bookId,
          chapter,
          // Choosing today again goes back to following today.
          chosenStartDate: chosen === today ? null : chosen,
        })),
      draft: buildReadingPlanDraft({
        mode: state.mode,
        bookId: state.bookId,
        chapter: state.chapter,
        startDate,
        canonId,
      }),
    };
  }, [state, today]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const value = useContext(OnboardingContext);
  if (value === null) {
    throw new Error("useOnboarding must be used inside an OnboardingProvider.");
  }
  return value;
}
