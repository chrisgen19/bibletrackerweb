"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { IconButton } from "@/components/icon-button";
import { AccountMenu } from "@/features/auth/components/account-menu";

interface StepShellProps {
  title: string;
  /** Under the title. */
  intro?: string;
  children: ReactNode;
}

/**
 * An onboarding step after the welcome: back and the account menu, a large title, and
 * the step's content.
 */
export function StepShell({ title, intro, children }: StepShellProps) {
  const router = useRouter();
  return (
    <main className="mx-auto w-full max-w-md px-5 pt-3 pb-24">
      <div className="flex items-center justify-between">
        <IconButton
          icon={ChevronLeft}
          label="Back"
          variant="plain"
          onClick={() => router.back()}
          className="-ml-3 text-primary"
        />
        <AccountMenu />
      </div>
      <h1 className="mt-2 text-large-title">{title}</h1>
      {intro === undefined ? null : (
        <p className="mt-3 text-body text-muted-foreground">{intro}</p>
      )}
      {children}
    </main>
  );
}
