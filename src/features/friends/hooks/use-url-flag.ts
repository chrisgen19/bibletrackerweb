"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

/** Tags a history entry this hook pushed, so closing knows it can go back to the page. */
const PUSHED = "__urlFlag";

interface UrlFlagOptions {
  /**
   * `replace` (the default) changes the URL in place: right for a disclosure. `push` adds
   * a history entry when turning on, so the browser's back button turns it off again:
   * right for a layer such as a sheet, as the day sheet does.
   */
  history?: "push" | "replace";
}

/**
 * A yes/no view state kept in the URL as `?key=value`, so a refresh or a shared link opens
 * the same view. Writes go through the History API, which Next keeps in sync with its
 * router (and with `useSearchParams` on back and forward) without a server round trip.
 */
export const useUrlFlag = (
  key: string,
  value: string,
  { history = "replace" }: UrlFlagOptions = {},
): [boolean, (on: boolean) => void] => {
  const params = useSearchParams();
  const fromUrl = params.get(key) === value;
  const [on, setOn] = useState(fromUrl);
  // Follow the URL when it changes from outside (back, forward, or a link to `?sheet=add`
  // while this screen is mounted), without an effect: adjust state during render instead.
  const [seen, setSeen] = useState(fromUrl);
  if (fromUrl !== seen) {
    setSeen(fromUrl);
    setOn(fromUrl);
  }

  const set = useCallback(
    (next: boolean) => {
      // Turning off an entry we pushed: go back to the page, as the back button would.
      // Opened straight from a link instead, there is nothing of ours to go back to.
      if (!next && window.history.state?.[PUSHED] === key) {
        setOn(false);
        window.history.back();
        return;
      }
      setOn(next);
      const url = new URL(window.location.href);
      if (next) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
      const href = `${url.pathname}${url.search}`;
      if (next && history === "push") {
        window.history.pushState({ [PUSHED]: key }, "", href);
      } else {
        window.history.replaceState(null, "", href);
      }
    },
    [key, value, history],
  );

  return [on, set];
};
