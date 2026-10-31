"use client";

import { useState } from "react";

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

/** The reader's invite link: copy, share (where the browser can) and reset. */
export function InviteLinkPanel({ inviteUrl }: { inviteUrl: string }) {
  const { run, pending, error } = useFriendAction();
  const [url, setUrl] = useState(inviteUrl);
  const [copyFailed, setCopyFailed] = useState(false);

  async function reset() {
    const result = await run(() => resetInvite());
    if (result === null) return;
    // The new link, built from the old one's origin and path.
    setUrl(`${url.slice(0, url.lastIndexOf("/") + 1)}${result.code}`);
  }

  return (
    <Panel>
      <p className="truncate rounded-lg bg-muted px-3 py-2.5 text-callout">
        {url}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <CopyShareButtons url={url} onCopyFailed={setCopyFailed} />
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
