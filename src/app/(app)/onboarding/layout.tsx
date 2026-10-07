import { redirect } from "next/navigation";

import { OnboardingProvider } from "@/features/reading-plan/hooks/onboarding-context";
import { getActiveReadingPlan } from "@/lib/dal";
import { requireUser } from "@/lib/session";

/** First run. A reader who already has a plan has nothing to set up. */
export default async function OnboardingLayout({
  children,
}: LayoutProps<"/onboarding">) {
  const user = await requireUser();
  if ((await getActiveReadingPlan(user.id)) !== null) redirect("/");
  return <OnboardingProvider>{children}</OnboardingProvider>;
}
