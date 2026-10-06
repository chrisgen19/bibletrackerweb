"use client";

import { startTransition, useEffect, useState } from "react";

import { syncTimeZone } from "@/actions/reading";
import { type DateKey, getTodayDateKey } from "@/utils/date-key";

interface LocalToday {
  readonly today: DateKey;
  /** This device's IANA zone; Server Actions judge "future" against it. */
  readonly timeZone: string;
}

interface State extends LocalToday {
  /** False until the device itself has been read; until then these are the server's guess. */
  readonly measured: boolean;
}

function readDevice(): State {
  return {
    today: getTodayDateKey(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    measured: true,
  };
}

/**
 * Whether the server should be told this device's zone: it rendered with a different one,
 * or with one that only matched by coincidence (the account-wide fallback, not this
 * device's own cookie). Without the second case a device whose zone happened to equal the
 * stored one never got a cookie, and later rendered in whatever zone another device saved.
 */
export function needsTimeZoneSync(
  deviceZone: string,
  renderedZone: string,
  renderedFromDevice: boolean,
): boolean {
  return deviceZone !== renderedZone || !renderedFromDevice;
}

/**
 * "Today" as this device sees it, the web version of the iOS provider's AppState check.
 *
 * Starts from the server's guess (its `tz` cookie, the stored zone, or UTC) so the first
 * render matches the HTML, then corrects to the browser's own day after hydration. It is
 * re-read when the tab becomes visible or the window gains focus, and at local midnight.
 * Once the device has been read, the server is told its zone when needed (see
 * `needsTimeZoneSync`), which sets this device's cookie for the next render.
 */
export function useLocalToday(
  initialToday: DateKey,
  initialTimeZone: string,
  initialTimeZoneFromDevice: boolean,
): LocalToday {
  const [state, setState] = useState<State>({
    today: initialToday,
    timeZone: initialTimeZone,
    measured: false,
  });

  useEffect(() => {
    function check() {
      const next = readDevice();
      setState((current) =>
        current.measured &&
        current.today === next.today &&
        current.timeZone === next.timeZone
          ? current
          : next,
      );
    }
    function onVisibilityChange() {
      if (document.visibilityState === "visible") check();
    }

    let midnight: ReturnType<typeof setTimeout> | undefined;
    function scheduleMidnight() {
      const now = new Date();
      const next = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      );
      // One second past midnight, so the new day is unambiguous.
      midnight = setTimeout(
        () => {
          check();
          scheduleMidnight();
        },
        next.getTime() - now.getTime() + 1000,
      );
    }

    check();
    scheduleMidnight();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", check);
    return () => {
      clearTimeout(midnight);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", check);
    };
  }, []);

  useEffect(() => {
    // Never sync the server's own guess back to it: wait until the device was read.
    if (!state.measured) return;
    if (
      !needsTimeZoneSync(
        state.timeZone,
        initialTimeZone,
        initialTimeZoneFromDevice,
      )
    ) {
      return;
    }
    startTransition(async () => {
      await syncTimeZone({ timeZone: state.timeZone });
    });
  }, [
    state.measured,
    state.timeZone,
    initialTimeZone,
    initialTimeZoneFromDevice,
  ]);

  return { today: state.today, timeZone: state.timeZone };
}
