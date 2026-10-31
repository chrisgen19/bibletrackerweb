"use client";

import { endOfMonth } from "date-fns";
import { useEffect, useRef, useState } from "react";

import { Panel } from "@/components/panel";
import {
  compareDateKeys,
  type DateKey,
  minDateKey,
  toDateKey,
} from "@/utils/date-key";

import { type MonthKey, monthKeyToDate } from "../domain/calendar-month";
import { useReadingHeatmap } from "../hooks/use-reading-heatmap";
import { useReadingJournal } from "../hooks/use-reading-journal";
import { HeatmapLegend, ReadingHeatmap } from "./reading-heatmap";
import { ReadingJournal } from "./reading-journal";

/** The journal row holding `date`, or the nearest older one when it has no row. */
function findJournalRow(list: HTMLElement, date: DateKey): HTMLElement | null {
  const rows = list.querySelectorAll<HTMLElement>("[data-journal-oldest]");
  for (const row of rows) {
    const oldest = row.dataset.journalOldest;
    if (oldest !== undefined && compareDateKeys(oldest, date) <= 0) return row;
  }
  return rows[rows.length - 1] ?? null;
}

/**
 * The reader's history: half a year at a glance, then the journal, day by day. Picking a
 * square or a month in the heatmap scrolls the journal to it, since the journal's rows,
 * not the small squares, are what open a day.
 */
export function HistoryScreen() {
  const heatmap = useReadingHeatmap();
  const journal = useReadingJournal();
  const { today, showThrough } = journal;
  const [selected, setSelected] = useState<DateKey>(today);
  const [revealed, setRevealed] = useState<{ date: DateKey } | null>(null);
  const list = useRef<HTMLDivElement>(null);

  function reveal(date: DateKey) {
    setSelected(date);
    showThrough(date);
    // A fresh object each time, so picking the same day twice scrolls again.
    setRevealed({ date });
  }

  function pickMonth(month: MonthKey) {
    reveal(minDateKey(toDateKey(endOfMonth(monthKeyToDate(month))), today));
  }

  // After the render that loaded the weeks it needs, so the row exists to scroll to.
  useEffect(() => {
    if (revealed === null || list.current === null) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    findJournalRow(list.current, revealed.date)?.scrollIntoView({
      block: "start",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [revealed]);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-4 pb-tab-bar">
      <h1 className="mt-2 mb-6 text-large-title">Reading history</h1>

      <Panel variant="raised">
        <ReadingHeatmap
          heatmap={heatmap}
          today={today}
          selected={selected}
          onSelect={setSelected}
          onReveal={reveal}
          onPickMonth={pickMonth}
        />
        <div className="mt-2.5">
          <HeatmapLegend />
        </div>
      </Panel>

      <ReadingJournal
        journal={journal}
        highlight={revealed?.date ?? null}
        listRef={list}
        className="mt-6"
      />
    </main>
  );
}
