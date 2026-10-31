"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { HistoryPanels } from "@/features/progress/components/history-panels";
import { useReadingView } from "@/features/reading-plan/hooks/reading-view-context";

import type { FriendProfile, FriendReading } from "../../domain/types";
import { FriendReadingProvider } from "../../hooks/friend-reading-provider";
import { Avatar } from "../avatar";
import { FriendCalendarCard } from "./friend-calendar-card";
import { FriendTodayCard } from "./friend-today-card";

interface FriendProfileScreenProps {
  profile: FriendProfile;
  /** The reading the server rendered; the provider refreshes it from there. */
  initial: FriendReading;
}

/**
 * What sits under the header. Reads the friend's live view, not the server's `initial`, so
 * a plan started while the profile is open shows up on the next refresh.
 */
function FriendProfileBody({ username }: { username: string }) {
  const { activePlan } = useReadingView();

  if (activePlan === null) {
    return (
      <EmptyState title={`@${username} hasn't started a reading plan yet.`} />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <FriendTodayCard />
      <FriendCalendarCard />
      <HistoryPanels />
    </div>
  );
}

/**
 * A friend's profile: how they are doing today, their month, and their reading history.
 * Read-only: it shows the friend's reading through the same calendar, heatmap and journal
 * the reader's own screens use.
 */
export function FriendProfileScreen({
  profile,
  initial,
}: FriendProfileScreenProps) {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-4 pb-tab-bar">
      <Link
        href="/friends"
        className="-ml-2 mb-3 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-callout text-primary outline-none hover:bg-primary-soft focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Friends
      </Link>

      <header className="mb-6 flex items-center gap-4">
        <Avatar name={profile.name} image={profile.image} className="size-14" />
        <div className="min-w-0">
          <h1 className="truncate text-large-title">{profile.name}</h1>
          <p className="truncate text-callout text-muted-foreground">
            @{profile.username}
          </p>
        </div>
      </header>

      <FriendReadingProvider username={profile.username} initial={initial}>
        <FriendProfileBody username={profile.username} />
      </FriendReadingProvider>
    </main>
  );
}
