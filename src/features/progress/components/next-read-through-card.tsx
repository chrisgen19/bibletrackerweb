"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";

import { Panel } from "@/components/panel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface NextReadThroughCardProps {
  /** The read-through that would start, e.g. 2. */
  nextReadThrough: number;
  onStart: () => void;
}

/**
 * Offered once the Bible is finished (web only, bibletrackerweb#18): read it again from
 * Genesis 1 without losing anything. Shown beside today's card rather than inside it,
 * so the finishing day can show "Completed today" and this offer together.
 */
export function NextReadThroughCard({
  nextReadThrough,
  onStart,
}: NextReadThroughCardProps) {
  const [confirming, setConfirming] = useState(false);
  const label = `read-through #${nextReadThrough}`;

  return (
    <Panel variant="raised">
      <p className="text-overline text-faint uppercase">Read it again</p>
      <p className="mt-2 text-headline">You have finished the Bible</p>
      <p className="mt-1 text-callout text-muted-foreground">
        {`Start ${label} from Genesis 1. Everything you have read stays on your calendar.`}
      </p>
      <Button
        size="large"
        className="mt-5 w-full"
        onClick={() => setConfirming(true)}
        data-testid="start-next-read-through"
      >
        <RotateCcw aria-hidden />
        {`Start Read-Through #${nextReadThrough}`}
      </Button>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{`Start ${label}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              Your plan starts again at Genesis 1 today, at the same pace.
              Everything you have read stays on your calendar and in your
              streaks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction
              onClick={onStart}
              data-testid="confirm-next-read-through"
            >
              Start
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  );
}
