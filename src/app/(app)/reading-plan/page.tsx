import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ReadingPlanScreen } from "@/features/reading-plan/components/reading-plan-screen";
import { getActiveReadingPlan } from "@/lib/dal";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Reading Plan" };

export default async function ReadingPlanPage() {
  const user = await requireUser();
  if ((await getActiveReadingPlan(user.id)) === null) redirect("/onboarding");
  return <ReadingPlanScreen />;
}
