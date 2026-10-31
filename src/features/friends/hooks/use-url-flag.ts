"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

/**
 * A yes/no view state kept in the URL as `?key=value`, so a refresh or a shared link opens
 * the same view. Writes go through the History API, which Next keeps in sync with its
 * router without a server round trip.
 */
export const useUrlFlag = (
  key: string,
  value: string,
): [boolean, (on: boolean) => void] => {
  const params = useSearchParams();
  const fromUrl = params.get(key) === value;
  const [on, setOn] = useState(fromUrl);
  // Follow the URL when it changes from outside (a link to `?sheet=add` while this
  // screen is mounted), without an effect: adjust state during render instead.
  const [seen, setSeen] = useState(fromUrl);
  if (fromUrl !== seen) {
    setSeen(fromUrl);
    setOn(fromUrl);
  }

  const set = useCallback(
    (next: boolean) => {
      setOn(next);
      const url = new URL(window.location.href);
      if (next) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    },
    [key, value],
  );

  return [on, set];
};
