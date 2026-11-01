"use client";

import { Book, Calendar, Flame, Repeat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

import { setCalendarView } from "@/actions/reading";
import { CheeringRow } from "@/features/friends/components/cheering-row";
import type { OpenNudges } from "@/features/friends/domain/types";
import { useOpenNudges } from "@/features/friends/hooks/use-open-nudges";
import { clearCheerNotifications } from "@/features/push/browser/push-client";
import { PushQuestion } from "@/features/push/components/push-question";
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
  /** The signed-in reader's id, which the calendar's remembered choices belong to. */
  readerId: string;
  /** The calendar view last chosen on a phone, from the reader's account. */
  savedCalendarView?: CalendarViewPreference;
  /** Friends who have cheered the reader on and are not yet dismissed. */
  initialNudges: OpenNudges;
  /** The VAPID public key for web push, or null when push is not configured. */
  vapidPublicKey: string | null;
}

/** bibletrackerapp's ProgressScreen (src/app/index.tsx). */
export function ProgressScreen({
  readerId,
  savedCalendarView = DEFAULT_CALENDAR_VIEW,
  initialNudges,
  vapidPublicKey,
}: ProgressScreenProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const {
    hasCompletedOnboarding,
    today,
    completionLookup,
    completeReading,
    currentReadThrough,
    finishedReadThroughs,
    canStartNextReadThrough,
    startNextReadThrough,
  } = useReadingData();

  const calendarView = useCalendarView(today, {
    readerId,
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
  // Any reading today closes the nudges on the server, extras included, so ask the full
  // lookup: `todayReading` is the plan's view, which an extra does not complete.
  const { senders, dismiss } = useOpenNudges(initialNudges, {
    todayCompleted: completionLookup.has(today),
  });

  // Cheers already seen here should not linger on the lock screen: clear them on load and
  // once today is read (the server closes the nudge then too).
  const todayDone = completionLookup.has(today);
  // biome-ignore lint/correctness/useExhaustiveDependencies: todayDone is the re-run trigger
  useEffect(() => {
    void clearCheerNotifications().catch(() => {});
  }, [todayDone]);

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
    <main className="mx-auto w-full max-w-5xl px-5 pt-6 pb-tab-bar">
      <h1 className="mb-3 flex min-h-11 items-center text-large-title">
        Your Reading
      </h1>

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
            banner={
              <CheeringRow senders={senders} onDismiss={dismiss}>
                <PushQuestion publicKey={vapidPublicKey} />
              </CheeringRow>
            }
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
