"use client";

import { startTransition, useEffect, useState } from "react";

import { syncTimeZone } from "@/actions/reading";
import { type DateKey, getTodayDateKey } from "@/utils/date-key";

interface LocalToday {
  readonly today: DateKey;
  /** This device's IANA zone; Server Actions judge "future" against it. */
  readonly timeZone: string;
}

function readDevice(): LocalToday {
  return {
    today: getTodayDateKey(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

/**
 * "Today" as this device sees it, the web version of the iOS provider's AppState check.
 *
 * Starts from the server's guess (its `tz` cookie, the stored zone, or UTC) so the first
 * render matches the HTML, then corrects to the browser's own day after hydration. It is
 * re-read when the tab becomes visible or the window gains focus, and at local midnight.
 * When the device's zone differs from the one the server rendered with, the server is
 * told, so the next render (and other devices' fallback) use it.
 */
export function useLocalToday(
  initialToday: DateKey,
  initialTimeZone: string,
): LocalToday {
  const [state, setState] = useState<LocalToday>({
    today: initialToday,
    timeZone: initialTimeZone,
  });

  useEffect(() => {
    function check() {
      const next = readDevice();
      setState((current) =>
        current.today === next.today && current.timeZone === next.timeZone
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
    if (state.timeZone === initialTimeZone) return;
    startTransition(async () => {
      await syncTimeZone({ timeZone: state.timeZone });
    });
  }, [state.timeZone, initialTimeZone]);

  return state;
}
