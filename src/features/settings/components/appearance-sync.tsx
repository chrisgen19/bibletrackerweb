"use client";

import { useEffect } from "react";

import { APPEARANCE_COOKIE, APPEARANCE_COOKIE_MAX_AGE } from "@/lib/appearance";
import type { AppearancePreference } from "@/lib/settings";

/**
 * A device with no appearance cookie yet takes the one stored on the account, and keeps
 * it from then on. Only this first load can show the system appearance before it.
 */
export function AppearanceSync({
  preference,
}: {
  preference: AppearancePreference;
}) {
  useEffect(() => {
    document.documentElement.dataset.appearance = preference;
    // biome-ignore lint/suspicious/noDocumentCookie: a plain preference cookie, also set by the setAppearance action
    document.cookie = `${APPEARANCE_COOKIE}=${preference}; path=/; max-age=${APPEARANCE_COOKIE_MAX_AGE}; samesite=lax`;
  }, [preference]);
  return null;
}
