/**
 * This device's timezone cookie, shared by the server (which works out "today" from it)
 * and the browser: the `syncTimeZone` action sets it once signed in, and the sign-in and
 * sign-up screens set it before there is an account, so the first page is in the right day.
 */
export const TIME_ZONE_COOKIE = "tz";

/** About 400 days, the longest lifetime browsers allow for a cookie. */
export const TIME_ZONE_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;
