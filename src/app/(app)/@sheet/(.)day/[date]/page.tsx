import { DayDetailScreen } from "@/features/progress/components/day-detail/day-detail-screen";
import { DaySheet } from "@/features/progress/components/day-detail/day-sheet";

interface InterceptedDayProps {
  params: Promise<{ date: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** A day opened from inside the app: a sheet over the screen it was opened from. */
export default async function InterceptedDay({
  params,
  searchParams,
}: InterceptedDayProps) {
  const { date } = await params;
  const query = await searchParams;
  return (
    <DaySheet>
      <DayDetailScreen
        date={date}
        book={first(query.book)}
        chapter={first(query.chapter)}
        heading="sheet"
      />
    </DaySheet>
  );
}
