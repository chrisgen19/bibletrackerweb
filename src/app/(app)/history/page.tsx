import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { HistoryScreen } from "@/features/progress/components/history-screen";
import { getActiveReadingPlan } from "@/lib/dal";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Reading History" };

export default async function HistoryPage() {
  const user = await requireUser();
  if ((await getActiveReadingPlan(user.id)) === null) redirect("/onboarding");
  return <HistoryScreen />;
}
