import type { Metadata } from "next";

import { WelcomeScreen } from "@/features/reading-plan/components/onboarding/welcome-screen";

export const metadata: Metadata = { title: "Welcome" };

export default function Page() {
  return <WelcomeScreen />;
}
