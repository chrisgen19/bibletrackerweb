import type { Metadata } from "next";

import { PositionScreen } from "@/features/reading-plan/components/onboarding/position-screen";

export const metadata: Metadata = { title: "Where you are up to" };

export default function Page() {
  return <PositionScreen />;
}
