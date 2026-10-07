"use client";

import { FieldRow } from "@/components/field-row";
import { Panel } from "@/components/panel";
import { ScreenHeader } from "@/components/screen-header";
import { SectionHeader } from "@/components/section-header";
import { getCanonIndex } from "@/data/bible/canon-index";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { formatReference } from "@/features/reading-plan/domain/reference";
import { useReadingData } from "@/features/reading-plan/hooks/reading-data-provider";
import type { AppearancePreference } from "@/lib/settings";

import { AppearanceSelector } from "./appearance-selector";
import { GoogleLinkRow, type GoogleLinkState } from "./google-link-row";
import { NameRow } from "./name-row";
import { PasswordRow } from "./password-row";
import { ResetProgressSection } from "./reset-progress-section";

interface SettingsScreenProps {
  appearance: AppearancePreference;
  name: string;
  email: string;
  /** False for a Google-only account, which has no password to change. */
  hasPassword: boolean;
  /** Null when Google sign-in is not configured. */
  google: GoogleLinkState | null;
}

/**
 * bibletrackerapp's settings, without the daily reminder (not in v1) and with the account
 * the web app adds.
 */
export function SettingsScreen({
  appearance,
  name,
  email,
  hasPassword,
  google,
}: SettingsScreenProps) {
  const { activePlan, scheduleContext } = useReadingData();
  // Where the reader is: the head of the unread queue, as the day detail reads it. Not
  // the plan segment's first chapter, which stays put however much is read.
  const position = scheduleContext.unread[0] ?? null;
  const currentPosition =
    activePlan === null
      ? "No plan yet"
      : position === null
        ? "Finished"
        : formatReference(position, getCanonIndex(activePlan.canonId));

  return (
    <main className="mx-auto w-full max-w-lg px-5 pt-4 pb-24">
      <ScreenHeader title="Settings" backHref="/" backLabel="Your Reading" />

      <section aria-labelledby="plan-heading">
        <SectionHeader id="plan-heading" title="Reading Plan" />
        <Panel padded={false} className="overflow-hidden">
          <FieldRow
            label="Current position"
            value={currentPosition}
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
        <Panel padded={false} className="overflow-hidden">
          <NameRow name={name} />
          {hasPassword ? <PasswordRow email={email} /> : null}
          <div className="relative flex items-center gap-3 py-2 pr-2 pl-4">
            <span className="min-w-0 flex-1 truncate text-body text-muted-foreground">
              {email}
            </span>
            <SignOutButton variant="plain" size="medium" />
            {google === null ? null : (
              <span
                aria-hidden
                className="absolute right-0 bottom-0 left-4 h-px bg-border"
              />
            )}
          </div>
          {google === null ? null : <GoogleLinkRow {...google} />}
        </Panel>
        {google === null || google.linked ? null : (
          <p className="mt-2 text-footnote text-faint">
            Connect Google to sign in with either your password or your Google
            account.
          </p>
        )}
      </section>

      <div className="mt-6">
        <ResetProgressSection />
      </div>
    </main>
  );
}
