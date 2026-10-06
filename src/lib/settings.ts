import { z } from "zod";

/**
 * Preference values shared by the data layer and the UI.
 *
 * Kept apart from `dal.ts` (server-only) so client components can import the types and
 * defaults. Ported from bibletrackerapp's settings-repository; the reminder settings are
 * not, since the web app has no reminders in v1.
 */

export const appearanceSchema = z.enum(["system", "light", "dark"]);
export type AppearancePreference = z.infer<typeof appearanceSchema>;

export const DEFAULT_APPEARANCE: AppearancePreference = "system";
