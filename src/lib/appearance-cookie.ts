import "server-only";

import { cookies } from "next/headers";

import { APPEARANCE_COOKIE } from "@/lib/appearance";
import { type AppearancePreference, appearanceSchema } from "@/lib/settings";

/**
 * This device's appearance choice, set by the `setAppearance` action, or null when it has
 * none (or an unreadable one). The stored setting is the copy a new device starts from.
 */
export async function readAppearanceCookie(): Promise<AppearancePreference | null> {
  const parsed = appearanceSchema.safeParse(
    (await cookies()).get(APPEARANCE_COOKIE)?.value,
  );
  return parsed.success ? parsed.data : null;
}
