"use client";

import { FieldRow } from "@/components/field-row";
import { Panel } from "@/components/panel";
import { ScreenHeader } from "@/components/screen-header";
import { SectionHeader } from "@/components/section-header";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { formatReference } from "@/features/reading-plan/domain/reference";
import { useReadingData } from "@/features/reading-plan/hooks/reading-data-provider";
import type { AppearancePreference } from "@/lib/settings";

import { AppearanceSelector } from "./appearance-selector";
import { ResetProgressSection } from "./reset-progress-section";

interface SettingsScreenProps {
  appearance: AppearancePreference;
  email: string;
}

/**
 * bibletrackerapp's settings, without the daily reminder (not in v1) and with the account
 * the web app adds.
 */
export function SettingsScreen({ appearance, email }: SettingsScreenProps) {
  const { activePlan } = useReadingData();
  const startReference =
    activePlan === null
      ? "No plan yet"
      : formatReference({
          bookId: activePlan.startBookId,
          chapter: activePlan.startChapter,
        });

  return (
    <main className="mx-auto w-full max-w-lg px-5 pt-4 pb-24">
      <ScreenHeader title="Settings" backHref="/" backLabel="Your Reading" />

      <section aria-labelledby="plan-heading">
        <SectionHeader id="plan-heading" title="Reading Plan" />
        <Panel padded={false} className="overflow-hidden">
          <FieldRow
            label="Current position"
            value={startReference}
            href="/reading-plan"
            last
          />
        </Panel>
        <p className="mt-2 text-footnote text-faint">
          Changing where you are starts a new stretch of your plan from today.
          Every day you have already completed stays exactly as it is.
        </p>
      </section>

      <section aria-labelledby="appearance-heading" className="mt-6">
        <SectionHeader id="appearance-heading" title="Appearance" />
        <AppearanceSelector initial={appearance} />
      </section>

      <section aria-labelledby="account-heading" className="mt-6">
        <SectionHeader id="account-heading" title="Account" />
        <Panel
          padded={false}
          className="flex items-center gap-3 py-2 pr-2 pl-4"
        >
          <span className="min-w-0 flex-1 truncate text-body text-muted-foreground">
            {email}
          </span>
          <SignOutButton variant="plain" size="medium" />
        </Panel>
      </section>

      <div className="mt-6">
        <ResetProgressSection />
      </div>
    </main>
  );
}
