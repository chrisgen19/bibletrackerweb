/**
 * The appearance cookie, shared by the server (which renders it onto <html>) and the
 * browser (which sets it for a device that has none yet).
 */
export const APPEARANCE_COOKIE = "appearance";

/** About 400 days, the longest lifetime browsers allow for a cookie. */
export const APPEARANCE_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;
