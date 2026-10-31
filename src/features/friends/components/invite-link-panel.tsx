"use client";

import { type ReactNode, useState } from "react";

import { resetInvite } from "@/actions/friends";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CopyShareButtons } from "@/features/friends/components/copy-share-buttons";
import { useFriendAction } from "@/features/friends/hooks/use-friend-action";

interface InviteLinkPanelProps {
  inviteUrl: string;
  /** Shown above the link inside the same panel, e.g. the reader's own username. */
  header?: ReactNode;
}

/** The reader's invite link: copy, share (where the browser can) and reset. */
export function InviteLinkPanel({ inviteUrl, header }: InviteLinkPanelProps) {
  const { run, pending, error } = useFriendAction();
  const [copyFailed, setCopyFailed] = useState(false);

  async function reset() {
    // The shared action hook refreshes the page, which brings the new link as the prop.
    await run(() => resetInvite());
  }

  return (
    <Panel>
      {header}
      <p className="truncate rounded-lg bg-muted px-3 py-2.5 text-callout">
        {inviteUrl}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <CopyShareButtons url={inviteUrl} onCopyFailed={setCopyFailed} />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="plain" size="medium" disabled={pending}>
              Reset
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset invite link?</AlertDialogTitle>
              <AlertDialogDescription>
                People who haven't used your old link won't be able to.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={reset}>
                Reset link
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {error === null && !copyFailed ? null : (
        <p role="alert" className="mt-3 text-footnote text-destructive">
          {error ?? "Couldn't copy. Select the link and copy it by hand."}
        </p>
      )}
    </Panel>
  );
}
