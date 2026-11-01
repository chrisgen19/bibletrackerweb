"use client";

import { Panel } from "@/components/panel";
import { DEFAULT_CANON_ID, getCanonIndex } from "@/data/bible/canon-index";
import { useReadingView } from "@/features/reading-plan/hooks/reading-view-context";

import {
  describeFriendToday,
  summariseFriendDay,
} from "../../domain/friend-today";
import type { FriendProfile } from "../../domain/types";
import { CheerButton } from "./cheer-button";

/** Whether the friend has read today, and how they are keeping up. */
export function FriendTodayCard({ profile }: { profile: FriendProfile }) {
  const view = useReadingView();
  const index = getCanonIndex(view.activePlan?.canonId ?? DEFAULT_CANON_ID);
  const summary = summariseFriendDay(view, index);
  const { headline, detail } = describeFriendToday(summary);

  return (
    <Panel>
      <p className="text-headline">{headline}</p>
      <p className="mt-1 text-footnote text-muted-foreground">{detail}</p>
      {summary.todayPassages === null && (
        <CheerButton key={view.today} friend={profile} />
      )}
    </Panel>
  );
}
