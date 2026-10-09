import type { ReadingSnapshot } from "@/lib/dal";

/**
 * Why a reading command was refused. Each has plain copy in `readingErrorMessage`, so a
 * Server Action never sends a raw error to the browser.
 */
export type ReadingErrorCode =
  /** The input failed validation (a tampered or out-of-date client). */
  | "invalid-input"
  /** Future days are view-only: you cannot log something you have not read yet. */
  | "future-date"
  /** There is no plan to attach the reading to (iOS returned `false` here). */
  | "no-plan"
  /** Onboarding ran twice: a plan already exists. */
  | "already-started"
  /** A position change may not start before today. */
  | "start-in-past"
  /** A book or chapter that is not in the plan's canon. */
  | "unknown-chapter"
  /** A verse span that runs past the end of the chapter. */
  | "verses-out-of-range"
  /** A new read-through starts only once the current one is finished. */
  | "not-finished"
  /** The request never got an answer (offline, a dropped connection). */
  | "network";

/** Every write returns the whole snapshot afterwards, as the iOS provider re-read it. */
export type ReadingResult =
  | { readonly ok: true; readonly snapshot: ReadingSnapshot }
  | { readonly ok: false; readonly error: ReadingErrorCode };

/** Results of writes that do not change reading data (settings). */
export type SettingResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: ReadingErrorCode };

export function readingErrorMessage(code: ReadingErrorCode): string {
  switch (code) {
    case "future-date":
      return "You can mark this reading once the day arrives.";
    case "no-plan":
      return "Set up your reading plan first.";
    case "already-started":
      return "Your reading plan is already set up.";
    case "start-in-past":
      return "A new position starts today or later.";
    case "unknown-chapter":
      return "That chapter isn't in this Bible.";
    case "verses-out-of-range":
      return "That chapter doesn't have that many verses.";
    case "not-finished":
      return "You can start a new read-through once you have finished the Bible.";
    case "network":
      return "Couldn't save that. Check your connection and try again.";
    case "invalid-input":
      return "Something went wrong saving that. Reload the page and try again.";
  }
}
