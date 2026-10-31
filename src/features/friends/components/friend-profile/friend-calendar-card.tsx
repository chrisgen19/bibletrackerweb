"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Panel } from "@/components/panel";
import { WeekdayHeader } from "@/features/progress/components/calendar-grid";
import { MonthNavigator } from "@/features/progress/components/month-navigator";
import { MonthPager } from "@/features/progress/components/month-pager";
import { MonthSummary } from "@/features/progress/components/month-summary";
import {
  addMonthsToMonthKey,
  monthKeyFromDateKey,
  monthKeysEqual,
} from "@/features/progress/domain/calendar-month";
import { useMonthWindow } from "@/features/progress/hooks/use-month-window";
import {
  useDayHref,
  useReadingView,
} from "@/features/reading-plan/hooks/reading-view-context";

/**
 * A friend's month calendar, opening on their today. Always the month grid: the week
 * strip, the remembered view and the link to the reader's own history are the reader's
 * own, and a day opens the friend's day, not the reader's.
 */
export function FriendCalendarCard() {
  const router = useRouter();
  const { today } = useReadingView();
  const dayHref = useDayHref();
  const todayMonth = monthKeyFromDateKey(today);
  const [month, setMonth] = useState(todayMonth);

  // The friend's today moves on when a refetch finds their new day. A calendar still on
  // the old today's month follows it; one the viewer stepped away from stays put.
  const [followedToday, setFollowedToday] = useState(today);
  if (followedToday !== today) {
    setFollowedToday(today);
    if (monthKeysEqual(month, monthKeyFromDateKey(followedToday))) {
      setMonth(todayMonth);
    }
  }

  const monthWindow = useMonthWindow(month);

  function step(amount: number) {
    setMonth((current) => addMonthsToMonthKey(current, amount));
  }

  return (
    <Panel variant="raised">
      <MonthNavigator
        title={monthWindow.current.calendar.title}
        onPrevious={() => step(-1)}
        onNext={() => step(1)}
        onReturnToToday={
          monthKeysEqual(month, todayMonth)
            ? undefined
            : () => setMonth(todayMonth)
        }
      />
      <div className="pt-4 pb-1">
        <MonthSummary statistics={monthWindow.current.statistics} />
        <div className="mt-4 border-t pt-3">
          <WeekdayHeader />
          <MonthPager
            window={monthWindow}
            today={today}
            onSelectDay={(date) => router.push(dayHref(date))}
            onStepMonth={step}
          />
        </div>
      </div>
    </Panel>
  );
}
