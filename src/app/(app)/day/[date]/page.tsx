import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Panel } from "@/components/panel";
import { DayDetailScreen } from "@/features/progress/components/day-detail/day-detail-screen";
import { getActiveReadingPlan } from "@/lib/dal";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Day" };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** A day on its own page: a direct load or refresh of a link the sheet opened. */
export default async function DayPage({
  params,
  searchParams,
}: PageProps<"/day/[date]">) {
  const user = await requireUser();
  if ((await getActiveReadingPlan(user.id)) === null) redirect("/onboarding");
  const { date } = await params;
  const query = await searchParams;

  return (
    <main className="mx-auto w-full max-w-lg px-5 pt-4 pb-24">
      <Link
        href="/"
        className="-ml-2 mb-3 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-callout text-primary outline-none hover:bg-primary-soft focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Your Reading
      </Link>
      <Panel>
        <DayDetailScreen
          date={date}
          book={first(query.book)}
          chapter={first(query.chapter)}
          heading="page"
        />
      </Panel>
    </main>
  );
}
