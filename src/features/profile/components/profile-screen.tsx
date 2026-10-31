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
  const stats = [
    { value: String(streaks.current), label: "day streak" },
    { value: chaptersRead.toLocaleString("en-US"), label: "chapters read" },
    { value: String(finishedReadThroughs), label: "times through" },
  ];

  return (
    <main className="mx-auto w-full max-w-lg px-5 pt-6 pb-tab-bar">
      <h1 className="text-large-title">Profile</h1>

      {/* The avatar wears the tab bar's lens, so the tab and the screen read as one. */}
      <div className="mt-6 flex flex-col items-center text-center">
        <span
          aria-hidden
          className="droplet flex size-24 items-center justify-center rounded-full text-display text-primary"
        >
          {initialOf(account.name, account.email)}
        </span>
        {name === "" ? null : (
          <p className="mt-4 max-w-full truncate text-title">{name}</p>
        )}
        <p
          className={
            name === ""
              ? "mt-4 max-w-full truncate text-headline"
              : "mt-1 max-w-full truncate text-callout text-muted-foreground"
          }
        >
          {account.email}
        </p>
      </div>

      <section aria-labelledby="reading-heading" className="mt-8">
        <SectionHeader id="reading-heading" title="Your reading" />
        <Panel padded={false} className="grid grid-cols-3 divide-x">
          {stats.map(({ value, label }) => (
            <p key={label} className="px-2 py-4 text-center">
              <span className="block text-title text-primary tabular-nums">
                {value}
              </span>
              <span className="mt-0.5 block text-footnote text-muted-foreground">
                {label}
              </span>
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
