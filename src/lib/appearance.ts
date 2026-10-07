import type { AppearancePreference } from "@/lib/settings";

/**
 * The appearance cookie, shared by the server (which renders it onto <html>) and the
 * browser (which sets it for a device that has none yet).
 */
export const APPEARANCE_COOKIE = "appearance";

/** About 400 days, the longest lifetime browsers allow for a cookie. */
export const APPEARANCE_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

/** The page background in each theme (globals.css), which the browser bar takes. */
export const THEME_COLORS = { light: "#fbfaf8", dark: "#121110" } as const;

/**
 * The browser bar's colour on a light and on a dark device, for an appearance. A chosen
 * appearance gives both the same colour; "system" follows the device, as the page does.
 */
export function themeColorsFor(appearance: AppearancePreference): {
  light: string;
  dark: string;
} {
  if (appearance === "system") return THEME_COLORS;
  const color = THEME_COLORS[appearance];
  return { light: color, dark: color };
}

/**
 * Shows an appearance at once, without a reload: the attribute globals.css reads, and the
 * colour of the theme-color tags the root layout renders (one per device scheme).
 */
export function applyAppearance(appearance: AppearancePreference): void {
  document.documentElement.dataset.appearance = appearance;
  const colors = themeColorsFor(appearance);
  for (const meta of document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]',
  )) {
    // Recoloured in place: the tags belong to React, so none is added or removed. The
    // attribute, since not every browser reflects it as `meta.media`.
    const media = meta.getAttribute("media") ?? "";
    meta.content = media.includes("dark") ? colors.dark : colors.light;
  }
}
