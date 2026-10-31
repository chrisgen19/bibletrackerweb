"use client";

import { FieldRow } from "@/components/field-row";
import { Panel } from "@/components/panel";
import { SectionHeader } from "@/components/section-header";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { useAccount } from "@/features/auth/hooks/account-context";
import { useReadingProgress } from "@/features/progress/hooks/use-reading-progress";
import { useStreaks } from "@/features/progress/hooks/use-streaks";
import { useReadingData } from "@/features/reading-plan/hooks/reading-data-provider";

/** The first letter of the name, else of the email. */
const initialOf = (name: string, email: string): string =>
  (name.trim() || email).charAt(0).toUpperCase();

/** Who is signed in, where they are in the Bible, and the way to settings. */
export function ProfileScreen() {
  const account = useAccount();
  const streaks = useStreaks();
  const { chaptersRead } = useReadingProgress();
  const { finishedReadThroughs } = useReadingData();
  const name = account.name.trim();

  return (
    <main className="mx-auto w-full max-w-lg px-5 pt-6 pb-24">
      <h1 className="mb-6 text-large-title">Profile</h1>

      <Panel className="flex items-center gap-4">
        <span
          aria-hidden
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-title text-primary"
        >
          {initialOf(account.name, account.email)}
        </span>
        <div className="min-w-0">
          {name === "" ? null : (
            <p className="truncate text-headline">{name}</p>
          )}
          <p className="truncate text-callout text-muted-foreground">
            {account.email}
          </p>
        </div>
      </Panel>

      <section aria-labelledby="reading-heading" className="mt-6">
        <SectionHeader id="reading-heading" title="Your reading" />
        <Panel padded={false} className="grid grid-cols-3 divide-x">
          {[
            { value: String(streaks.current), label: "day streak" },
            {
              value: chaptersRead.toLocaleString("en-US"),
              label: "chapters this read-through",
            },
            {
              value: String(finishedReadThroughs),
              label: "times through",
            },
          ].map(({ value, label }) => (
            <p key={label} className="px-3 py-4 text-center">
              <span className="block text-headline">{value}</span>
              <span className="block text-footnote text-faint">{label}</span>
            </p>
          ))}
        </Panel>
      </section>

      <section aria-labelledby="manage-heading" className="mt-6">
        <SectionHeader id="manage-heading" title="Manage" />
        <Panel padded={false} className="overflow-hidden">
          <FieldRow label="Reading plan" value="" href="/reading-plan" />
          <FieldRow label="Settings" value="" href="/settings" last />
        </Panel>
      </section>

      <div className="mt-6 flex justify-center">
        <SignOutButton variant="plain" size="medium" />
      </div>
    </main>
  );
}
