"use client";

import { useState } from "react";

import { Panel } from "@/components/panel";
import { SectionHeader } from "@/components/section-header";
import type { PushDeviceStatus } from "@/features/push/domain/types";
import { usePushDevice } from "@/features/push/hooks/use-push-device";
import { cn } from "@/lib/utils";

const FOOTNOTES: Partial<Record<PushDeviceStatus, string>> = {
  on: "Get a notification on this phone when a friend cheers you on.",
  off: "Get a notification on this phone when a friend cheers you on.",
  blocked:
    "Notifications are blocked for Bible Daily. Allow them in your phone's settings, then come back.",
  "needs-install":
    "On iPhone, add Bible Daily to your Home Screen first: tap Share, then Add to Home Screen, and open it from there.",
  unsupported: "This browser can't show notifications.",
};

/**
 * Settings "Notifications" section: a switch for cheers on this phone. Renders nothing
 * while checking, when push is not configured, or off a phone, so desktop never sees it.
 * Unlike the Today question, it ignores the "Not now" count.
 */
export function NotificationsSection({
  publicKey,
}: {
  publicKey: string | null;
}) {
  const { status, turnOn, turnOff } = usePushDevice(publicKey);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const footnote = FOOTNOTES[status];
  if (footnote === undefined) return null;

  const checked = status === "on";
  const usable = status === "on" || status === "off";

  async function onToggle() {
    setPending(true);
    setFailed(false);
    if (checked) {
      await turnOff();
    } else {
      const outcome = await turnOn();
      if (outcome === "failed") setFailed(true);
    }
    setPending(false);
  }

  return (
    <section aria-labelledby="notifications-heading" className="mt-6">
      <SectionHeader id="notifications-heading" title="Notifications" />
      <Panel padded={false}>
        <div className="flex min-h-[50px] items-center gap-3 px-4">
          <span id="cheers-switch-label" className="flex-1 text-body">
            Cheers from friends
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-labelledby="cheers-switch-label"
            disabled={!usable || pending}
            onClick={() => void onToggle()}
            className={cn(
              "relative h-8 w-13 shrink-0 rounded-full outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
              checked ? "bg-primary" : "bg-muted-foreground/30",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute top-1 left-1 size-6 rounded-full bg-white shadow transition-transform",
                checked && "translate-x-5",
              )}
            />
          </button>
        </div>
      </Panel>
      <p className="mt-2 text-footnote text-faint">{footnote}</p>
      {failed ? (
        <p role="alert" className="mt-1 text-sm text-destructive">
          Couldn't turn on notifications. Try again.
        </p>
      ) : null}
    </section>
  );
}
