"use client";

import { useEffect, useState } from "react";
import {
  addNotNow,
  NOT_NOW_LIMIT,
  readNotNowCount,
} from "@/features/push/hooks/not-now";
import { usePushDevice } from "@/features/push/hooks/use-push-device";

/** How long "You'll get cheers on your lock screen" stays up. */
const CONFIRMATION_MS = 3000;

type Phase = "checking" | "asking" | "confirmed" | "hidden";

/** Browser-only: permission never asked and "Not now" tapped fewer than three times. */
const canAsk = (): boolean =>
  typeof window !== "undefined" &&
  "Notification" in window &&
  Notification.permission === "default" &&
  readNotNowCount() < NOT_NOW_LIMIT;

/**
 * The second line of the cheering row: asks whether to send cheers to the lock screen.
 * Renders nothing unless this device is a phone that can take push, has not been asked
 * and has not said "Not now" three times. Decided after mount so the server render and
 * first client render match.
 */
export function PushQuestion({ publicKey }: { publicKey: string | null }) {
  const { status, turnOn } = usePushDevice(publicKey);
  const [phase, setPhase] = useState<Phase>("checking");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    setPhase((prev) => {
      if (prev !== "checking") return prev;
      return status === "off" && canAsk() ? "asking" : "hidden";
    });
  }, [status]);

  useEffect(() => {
    if (phase !== "confirmed") return;
    const timer = setTimeout(() => setPhase("hidden"), CONFIRMATION_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  function notNow() {
    addNotNow();
    setPhase("hidden");
  }

  async function onTurnOn() {
    setPending(true);
    setFailed(false);
    const outcome = await turnOn();
    setPending(false);
    if (outcome === "on") setPhase("confirmed");
    else if (outcome === "blocked") setPhase("hidden");
    else if (outcome === "dismissed") notNow();
    else setFailed(true);
  }

  if (phase === "confirmed") {
    return (
      <p className="animate-in py-2 text-callout text-foreground fade-in">
        You'll get cheers on your lock screen
      </p>
    );
  }
  if (phase !== "asking") return null;

  return (
    <div className="animate-in fade-in">
      <p className="text-callout text-muted-foreground">
        Want these on your lock screen?
      </p>
      {/* Labels never break; on a narrow phone the pair wraps to two rows instead. */}
      <div className="flex flex-wrap items-center gap-x-1">
        <button
          type="button"
          onClick={() => void onTurnOn()}
          disabled={pending}
          className="my-1 flex min-h-11 shrink-0 items-center rounded-full bg-primary px-4 whitespace-nowrap text-callout font-semibold text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
        >
          Turn on
        </button>
        <button
          type="button"
          onClick={notNow}
          disabled={pending}
          className="flex min-h-11 shrink-0 items-center rounded-full px-3 whitespace-nowrap text-callout text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
        >
          Not now
        </button>
      </div>
      {failed ? (
        <p role="alert" className="pb-2 text-sm text-destructive">
          Couldn't turn on notifications. Try again.
        </p>
      ) : null}
    </div>
  );
}
