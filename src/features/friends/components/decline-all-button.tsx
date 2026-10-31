"use client";

import { declineAllRequests } from "@/actions/friends";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useFriendAction } from "@/features/friends/hooks/use-friend-action";

/** Clears a flood of requests (a leaked link) in one confirmed step. */
export function DeclineAllButton({ count }: { count: number }) {
  const { run, pending, error } = useFriendAction();
  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="plain" size="lg" disabled={pending}>
            Decline all
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline all requests?</AlertDialogTitle>
            <AlertDialogDescription>
              {count} people won't be told.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => run(() => declineAllRequests())}
            >
              Decline all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error === null ? null : (
        <p role="alert" className="text-footnote text-destructive">
          {error}
        </p>
      )}
    </>
  );
}
