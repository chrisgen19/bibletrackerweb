"use client";

import { useEffect, useState } from "react";

/**
 * `pending` for a button that sends the browser to another site, such as Google.
 *
 * Safari keeps HTTPS pages in its back/forward cache even when they say `no-store`, so
 * going back from Google can restore this page exactly as it was left: the button still
 * pending and disabled. A restored page fires `pageshow` with `persisted`, which resets it.
 * (Chrome reloads instead: starting OAuth sets an HttpOnly cookie, which rules its cache out.)
 */
export function useLeavingPending() {
  const [pending, setPending] = useState(false);
  useEffect(() => {
    function reset(event: PageTransitionEvent) {
      if (event.persisted) setPending(false);
    }
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);
  return [pending, setPending] as const;
}
