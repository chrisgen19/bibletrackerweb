"use client";

import { Check, Copy, Share } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

interface CopyShareButtonsProps {
  url: string;
  /** Reports whether the last copy attempt failed, so the caller can show the copy. */
  onCopyFailed: (failed: boolean) => void;
}

/** Copy, and Share where the browser can, for an invite link. */
export function CopyShareButtons({ url, onCopyFailed }: CopyShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  // False on the server and during hydration, so the Share button cannot mismatch.
  const canShare = useSyncExternalStore(
    () => () => {},
    () => "share" in navigator,
    () => false,
  );

  async function copy() {
    onCopyFailed(false);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      onCopyFailed(true);
    }
  }

  async function share() {
    try {
      await navigator.share({ url });
    } catch {
      // Dismissing the share sheet rejects; there is nothing to report.
    }
  }

  return (
    <>
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
    </>
  );
}
