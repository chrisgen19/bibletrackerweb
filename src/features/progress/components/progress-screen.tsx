"use client";

import { Book, Calendar, Flame, Repeat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

import { setCalendarView } from "@/actions/reading";
import { AccountMenu } from "@/features/auth/components/account-menu";
import { useReadingData } from "@/features/reading-plan/hooks/reading-data-provider";
import { useWritesSettled } from "@/features/reading-plan/hooks/use-writes-settled";
import {
  type CalendarViewPreference,
  DEFAULT_CALENDAR_VIEW,
} from "@/lib/settings";

import { useCalendarView } from "../hooks/use-calendar-view";
import { useMonthWindow } from "../hooks/use-month-window";
import { useReadingProgress } from "../hooks/use-reading-progress";
import { useStreaks } from "../hooks/use-streaks";
import { useWeekWindow } from "../hooks/use-week-window";
import { CalendarSurface } from "./calendar-surface";
import { NextReadThroughCard } from "./next-read-through-card";
import { StatRow } from "./stat-row";
import { TodayReadingCard } from "./today-reading-card";
import { UnfinishedList } from "./unfinished-list";

interface ProgressScreenProps {
  /** The calendar view last chosen on a phone, from the reader's account. */
  savedCalendarView?: CalendarViewPreference;
}

/** bibletrackerapp's ProgressScreen (src/app/index.tsx). */
export function ProgressScreen({
  savedCalendarView = DEFAULT_CALENDAR_VIEW,
}: ProgressScreenProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const {
    hasCompletedOnboarding,
    today,
    completeReading,
    currentReadThrough,
    finishedReadThroughs,
    canStartNextReadThrough,
    startNextReadThrough,
  } = useReadingData();

  const calendarView = useCalendarView(today, {
    savedView: savedCalendarView,
    // Stored in the background: the view has already changed, and a failed write only
    // means the next load opens on the previous choice.
    onRemember: (view) =>
      startTransition(async () => {
        await setCalendarView({ view });
      }),
  });
  const monthWindow = useMonthWindow(calendarView.monthKey);
  const weekWindow = useWeekWindow(calendarView.weekStart);
  const streaks = useStreaks();
  const { todayReading, todayProgress, unfinished, chaptersRead, canonIndex } =
    useReadingProgress();

  // A reset on this or another device ends the plan: back to onboarding, as on iOS.
  // Only once it is stored, or the server would still see the plan and send us back.
  const settled = useWritesSettled();
  useEffect(() => {
    if (!hasCompletedOnboarding && settled) router.replace("/onboarding");
  }, [hasCompletedOnboarding, settled, router]);

  function markTodayRead() {
    if (todayReading.scheduled.kind !== "scheduled") return;
    completeReading(today, todayReading.scheduled.chapters);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pt-6 pb-24">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-large-title">Your Reading</h1>
        <AccountMenu />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
        <CalendarSurface
          view={calendarView}
          monthWindow={monthWindow}
          weekWindow={weekWindow}
          today={today}
          onSelectDay={(date) => router.push(`/day/${date}`)}
        />
        <div className="grid gap-6">
          <TodayReadingCard
            day={todayReading}
            onMarkRead={markTodayRead}
            detailHref={`/day/${today}`}
            progress={todayProgress}
          />
          {canStartNextReadThrough ? (
            <NextReadThroughCard
              nextReadThrough={currentReadThrough + 1}
              onStart={startNextReadThrough}
            />
          ) : null}
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
              // Progress is per read-through, so a second time through starts from 0.
              {
                icon: Book,
                value: chaptersRead.toLocaleString("en-US"),
                label: "chapters this read-through",
              },
              {
                icon: Repeat,
                value: String(finishedReadThroughs),
                label: "times through the Bible",
              },
            ]}
          />
        </div>
      </div>
    </main>
  );
}
