"use client";

import { Book, Flame } from "lucide-react";
import { useRouter } from "next/navigation";
import { RadioGroup } from "radix-ui";

import { Button } from "@/components/ui/button";
import type { StartMode } from "@/features/reading-plan/domain/types";
import { useOnboarding } from "@/features/reading-plan/hooks/onboarding-context";

import { SelectionCard } from "../selection-card";
import { StepShell } from "./step-shell";

const OPTIONS = [
  {
    mode: "genesis",
    title: "Start from Genesis",
    description: "Begin at Genesis 1 today and read straight through.",
    icon: Book,
  },
  {
    mode: "choose",
    title: "Choose where to start",
    description: "Pick the chapter you're up to. It becomes today's reading.",
    icon: Flame,
  },
] as const satisfies readonly {
  mode: StartMode;
  title: string;
  description: string;
  icon: unknown;
}[];

export function StartModeScreen() {
  const router = useRouter();
  const { mode, setMode } = useOnboarding();

  return (
    <StepShell
      title="Where would you like to begin?"
      intro="You can change this later without losing any progress."
    >
      <RadioGroup.Root
        aria-label="Where would you like to begin?"
        value={mode}
        onValueChange={(next) => {
          const option = OPTIONS.find((candidate) => candidate.mode === next);
          if (option !== undefined) setMode(option.mode);
        }}
        className="mt-6 grid gap-3"
      >
        {OPTIONS.map((option) => (
          <SelectionCard
            key={option.mode}
            value={option.mode}
            title={option.title}
            description={option.description}
            icon={option.icon}
            selected={mode === option.mode}
          />
        ))}
      </RadioGroup.Root>
      <Button
        size="large"
        className="mt-8 w-full"
        onClick={() =>
          router.push(
            mode === "genesis" ? "/onboarding/confirm" : "/onboarding/position",
          )
        }
      >
        Continue
      </Button>
    </StepShell>
  );
}
