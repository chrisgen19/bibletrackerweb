import type { Metadata } from "next";

import { StartModeScreen } from "@/features/reading-plan/components/onboarding/start-mode-screen";

export const metadata: Metadata = { title: "Where to begin" };

export default function Page() {
  return <StartModeScreen />;
}
