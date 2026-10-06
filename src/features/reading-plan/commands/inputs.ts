import { z } from "zod";

import { readingPlanDraftSchema } from "@/features/reading-plan/domain/plan-draft";
import { appearanceSchema } from "@/lib/settings";
import { isValidDateKey } from "@/utils/date-key";
import { isValidTimeZone } from "@/utils/zoned-date-key";

/**
 * What the browser may send to the reading Server Actions.
 *
 * Shared by both sides: the client builds these, and the server parses them again,
 * because a Server Action is a public endpoint whatever the TypeScript types say.
 */

const dateKey = z
  .string()
  .refine(isValidDateKey, "Not a valid YYYY-MM-DD day.");

/** The browser's IANA zone, so "today" is the reader's day, not the server's. */
const timeZone = z.string().refine(isValidTimeZone, "Unknown timezone.");

const reference = z.object({
  bookId: z.string().min(1).max(8),
  chapter: z.number().int().min(1).max(200),
});

export const startPlanInput = z.object({ draft: readingPlanDraftSchema });

export const changePlanInput = z.object({
  draft: readingPlanDraftSchema,
  timeZone,
});

export const completeReadingInput = z
  .object({
    date: dateKey,
    // A day reads at most 10 chapters (plan-draft.ts caps chaptersPerDay at 10).
    chapters: z.array(reference).min(1).max(10),
    verses: z
      .object({
        from: z.number().int().min(1),
        to: z.number().int().min(1),
      })
      .refine(
        (span) => span.from <= span.to,
        "A verse span must not be reversed.",
      )
      .optional(),
    /** Client-generated row ids, one per chapter. See `MarkCompleteInput.ids`. */
    ids: z.array(z.uuid()).optional(),
    timeZone,
  })
  .refine(
    (input) =>
      input.ids === undefined || input.ids.length === input.chapters.length,
    { message: "Send one id per chapter.", path: ["ids"] },
  );

export const undoReadingInput = z.object({ date: dateKey });

// Not checked as a UUID: an id that is not one matches nothing, as on iOS.
export const undoReadingEntryInput = z.object({
  id: z.string().min(1).max(64),
});

export const syncTimeZoneInput = z.object({ timeZone });

export const setAppearanceInput = z.object({ appearance: appearanceSchema });

export type StartPlanInput = z.input<typeof startPlanInput>;
export type ChangePlanInput = z.input<typeof changePlanInput>;
export type CompleteReadingInput = z.input<typeof completeReadingInput>;
export type UndoReadingInput = z.input<typeof undoReadingInput>;
export type UndoReadingEntryInput = z.input<typeof undoReadingEntryInput>;
export type SyncTimeZoneInput = z.input<typeof syncTimeZoneInput>;
export type SetAppearanceInput = z.input<typeof setAppearanceInput>;
