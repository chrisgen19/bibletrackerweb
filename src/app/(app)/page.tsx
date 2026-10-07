import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProgressScreen } from "@/features/progress/components/progress-screen";
import { getActiveReadingPlan } from "@/lib/dal";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Your Reading" };

export default async function ProgressPage() {
  const user = await requireUser();
  // The presence of a plan is the onboarding marker, as on iOS.
  if ((await getActiveReadingPlan(user.id)) === null) redirect("/onboarding");
  return <ProgressScreen />;
}
