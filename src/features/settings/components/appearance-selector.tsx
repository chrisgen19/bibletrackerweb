"use client";

import { useState, useTransition } from "react";
import { setAppearance } from "@/actions/reading";
import {
  SegmentedControl,
  type SegmentOption,
} from "@/components/segmented-control";
import { applyAppearance } from "@/lib/appearance";
import type { AppearancePreference } from "@/lib/settings";

const OPTIONS: readonly SegmentOption<AppearancePreference>[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/**
 * System, light or dark. The page and the browser bar change at once; the action stores
 * the choice and sets this device's cookie, so the next load matches.
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
    applyAppearance(next);
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
