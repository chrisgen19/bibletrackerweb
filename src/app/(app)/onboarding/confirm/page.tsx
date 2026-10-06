import type { Metadata } from "next";

import { ConfirmScreen } from "@/features/reading-plan/components/onboarding/confirm-screen";

export const metadata: Metadata = { title: "Your first reading" };

export default function Page() {
  return <ConfirmScreen />;
}
