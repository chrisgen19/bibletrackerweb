"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/features/reading-plan/hooks/onboarding-context";

import { ReadingPositionFields } from "../reading-position-fields";
import { StepShell } from "./step-shell";

export function PositionScreen() {
  const { canonId, bookId, chapter, startDate, setPosition } = useOnboarding();

  return (
    <StepShell
      title="Where are you up to?"
      intro="The chapter you choose becomes your reading for today."
    >
      <div className="mt-4">
        <ReadingPositionFields
          canonId={canonId}
          value={{ bookId, chapter, startDate }}
          onChange={setPosition}
          allowStartDate
        />
      </div>
      <Button asChild size="large" className="mt-6 w-full">
        <Link href="/onboarding/confirm">Continue</Link>
      </Button>
    </StepShell>
  );
}
