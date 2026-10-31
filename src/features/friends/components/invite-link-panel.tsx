"use client";

import { Check, Copy, Share } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

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
import { useFriendAction } from "@/features/friends/hooks/use-friend-action";

/** The reader's invite link: copy, share (where the browser can) and reset. */
export function InviteLinkPanel({ inviteUrl }: { inviteUrl: string }) {
  const { run, pending, error } = useFriendAction();
  const [url, setUrl] = useState(inviteUrl);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  // False on the server and during hydration, so the Share button cannot mismatch.
  const canShare = useSyncExternalStore(
    () => () => {},
    () => "share" in navigator,
    () => false,
  );

  async function copy() {
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
    }
  }

  async function share() {
    try {
      await navigator.share({ url });
    } catch {
      // Dismissing the share sheet rejects; there is nothing to report.
    }
  }

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
        <Button variant="secondary" size="medium" onClick={copy}>
          {copied ? (
            <Check aria-hidden className="size-4" />
          ) : (
            <Copy aria-hidden className="size-4" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
        {canShare ? (
          <Button variant="secondary" size="medium" onClick={share}>
            <Share aria-hidden className="size-4" />
            Share
          </Button>
        ) : null}
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
