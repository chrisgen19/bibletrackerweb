"use client";

import { useState, useTransition } from "react";
import { setAppearance } from "@/actions/reading";
import {
  SegmentedControl,
  type SegmentOption,
} from "@/components/segmented-control";
import type { AppearancePreference } from "@/lib/settings";

const OPTIONS: readonly SegmentOption<AppearancePreference>[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/**
 * System, light or dark. The page changes at once (the attribute globals.css reads); the
 * action stores the choice and sets this device's cookie, so the next load matches.
 */
export function AppearanceSelector({
  initial,
}: {
  initial: AppearancePreference;
}) {
  const [value, setValue] = useState(initial);
  const [, startTransition] = useTransition();

  function choose(next: AppearancePreference) {
    setValue(next);
    document.documentElement.dataset.appearance = next;
    startTransition(async () => {
      await setAppearance({ appearance: next });
    });
  }

  return (
    <SegmentedControl
      options={OPTIONS}
      value={value}
      onChange={choose}
      label="Appearance"
    />
  );
}
