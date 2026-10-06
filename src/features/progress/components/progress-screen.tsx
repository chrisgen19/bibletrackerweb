"use client";

import { Book, Calendar, Flame, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { IconButton } from "@/components/icon-button";
import { useReadingData } from "@/features/reading-plan/hooks/reading-data-provider";

import {
  addMonthsToMonthKey,
  type MonthKey,
  monthKeyFromDateKey,
  monthKeysEqual,
} from "../domain/calendar-month";
import { useMonthWindow } from "../hooks/use-month-window";
import { useReadingProgress } from "../hooks/use-reading-progress";
import { useStreaks } from "../hooks/use-streaks";
import { CalendarSurface } from "./calendar-surface";
import { StatRow } from "./stat-row";
import { TodayReadingCard } from "./today-reading-card";
import { UnfinishedList } from "./unfinished-list";

/** bibletrackerapp's ProgressScreen (src/app/index.tsx). */
export function ProgressScreen() {
  const router = useRouter();
  const { hasCompletedOnboarding, today, completeReading } = useReadingData();

  const [monthKey, setMonthKey] = useState<MonthKey>(() =>
    monthKeyFromDateKey(today),
  );
  const monthWindow = useMonthWindow(monthKey);
  const streaks = useStreaks();
  const { todayReading, todayProgress, unfinished, chaptersRead, canonIndex } =
    useReadingProgress();
  const currentMonthKey = useMemo(() => monthKeyFromDateKey(today), [today]);

  // A reset on this or another device ends the plan: back to onboarding, as on iOS.
  useEffect(() => {
    if (!hasCompletedOnboarding) router.replace("/onboarding");
  }, [hasCompletedOnboarding, router]);

  function markTodayRead() {
    if (todayReading.scheduled.kind !== "scheduled") return;
    completeReading(today, todayReading.scheduled.chapters);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pt-6 pb-24">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-large-title">Your Reading</h1>
        <IconButton
          icon={Settings}
          label="Settings"
          href="/settings"
          variant="plain"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
        <CalendarSurface
          window={monthWindow}
          today={today}
          onSelectDay={(date) => router.push(`/day/${date}`)}
          onStepMonth={(step) =>
            setMonthKey((key) => addMonthsToMonthKey(key, step))
          }
          onReturnToToday={
            monthKeysEqual(monthKey, currentMonthKey)
              ? undefined
              : () => setMonthKey(currentMonthKey)
          }
        />
        <div className="grid gap-6">
          <TodayReadingCard
            day={todayReading}
            onMarkRead={markTodayRead}
            detailHref={`/day/${today}`}
            progress={todayProgress}
          />
          <UnfinishedList
            chapters={unfinished}
            index={canonIndex}
            today={today}
          />
          <StatRow
            stats={[
              {
                icon: Flame,
                value: String(streaks.current),
                label: "day streak",
              },
              {
                icon: Calendar,
                value: String(streaks.longest),
                label: "longest streak",
              },
              {
                icon: Book,
                value: String(chaptersRead),
                label: "chapters read",
              },
            ]}
          />
        </div>
      </div>
    </main>
  );
}
