"use client";

import { format } from "date-fns";
import { useState } from "react";

import {
  SegmentedControl,
  type SegmentOption,
} from "@/components/segmented-control";
import { SheetTitle } from "@/components/ui/sheet";
import { compareDateKeys, fromDateKey } from "@/utils/date-key";

import { CustomPanel } from "./custom-panel";
import { PlanPanel } from "./plan-panel";
import type { DayDetailProps } from "./types";

type Tab = "plan" | "custom";

const TABS: readonly SegmentOption<Tab>[] = [
  { value: "plan", label: "Reading plan" },
  { value: "custom", label: "Custom" },
];

/**
 * One day: what was scheduled, what was recorded, and how to record more.
 *
 * `heading` is "sheet" inside the day sheet, whose title names the dialog, and "page"
 * when the day is its own page.
 */
export function DayDetail({
  heading,
  ...props
}: DayDetailProps & { heading: "page" | "sheet" }) {
  const { day, today, focusChapter } = props;
  // Arriving from the unfinished list lands directly on Custom with that chapter.
  const [tab, setTab] = useState<Tab>(
    focusChapter === null ? "plan" : "custom",
  );
  const isFuture = compareDateKeys(day.date, today) > 0;
  const parsed = fromDateKey(day.date);
  const title = format(parsed, "d MMMM yyyy");

  return (
    <div>
      <p className="text-overline text-faint">
        {day.date === today ? "TODAY" : format(parsed, "EEEE").toUpperCase()}
      </p>
      {heading === "sheet" ? (
        <SheetTitle className="mt-1 text-title">{title}</SheetTitle>
      ) : (
        <h1 className="mt-1 text-title">{title}</h1>
      )}

      {/* Future readings are view-only: you cannot log something you have not read. */}
      {isFuture ? null : (
        <SegmentedControl
          options={TABS}
          value={tab}
          onChange={setTab}
          label="What to log for this day"
          className="mt-5"
        />
      )}

      {tab === "plan" || isFuture ? (
        <PlanPanel {...props} isFuture={isFuture} />
      ) : (
        <CustomPanel {...props} />
      )}
    </div>
  );
}
