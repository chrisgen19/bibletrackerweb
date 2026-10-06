"use client";

import { Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { EmptyState } from "@/components/empty-state";
import { useReadingData } from "@/features/reading-plan/hooks/reading-data-provider";

import { useDayDetail } from "../../hooks/use-day-detail";
import { DayDetail } from "./day-detail";

interface DayDetailScreenProps {
  date: string;
  book?: string;
  chapter?: string;
  /** Also decides how "Close" leaves an unknown day: back out of a sheet, home from a page. */
  heading: "page" | "sheet";
}

/** The day route's content, shared by the sheet and the full page. */
export function DayDetailScreen({
  date,
  book,
  chapter,
  heading,
}: DayDetailScreenProps) {
  const router = useRouter();
  const { plans } = useReadingData();
  const detail = useDayDetail(date, book, chapter);

  // Without any plan there is nothing to attach a reading to (a reset on another
  // device, say). Mirror the main screen and go to onboarding, as on iOS.
  useEffect(() => {
    if (plans.length === 0) router.replace("/onboarding");
  }, [plans.length, router]);

  if (detail === null) {
    return (
      <EmptyState
        icon={Calendar}
        title="That day isn't available"
        description="We couldn't find a reading for that date."
        action={
          heading === "sheet"
            ? { label: "Close", onClick: () => router.back() }
            : { label: "Close", href: "/" }
        }
        compact
      />
    );
  }
  return <DayDetail {...detail} heading={heading} />;
}
