/** localStorage key for how many times "Not now" was tapped on this device. */
export const NOT_NOW_KEY = "push-not-now-count";

/** After this many "Not now" taps the Today question never shows again on this device. */
export const NOT_NOW_LIMIT = 3;

/** The stored count, or 0 when storage is missing, blocked or holds junk. */
export const readNotNowCount = (): number => {
  try {
    const value = Number(window.localStorage.getItem(NOT_NOW_KEY));
    return Number.isInteger(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
};

/** Counts one more "Not now" and returns the new count. Storage failures are ignored. */
export const addNotNow = (): number => {
  const next = readNotNowCount() + 1;
  try {
    window.localStorage.setItem(NOT_NOW_KEY, String(next));
  } catch {
    // Without storage the question simply returns next visit.
  }
  return next;
};
