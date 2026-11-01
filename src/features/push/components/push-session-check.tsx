"use client";

import { useEffect } from "react";

import { useReadingData } from "@/features/reading-plan/hooks/reading-data-provider";

import { clearCheerNotifications } from "../browser/push-client";
import { usePushDevice } from "../hooks/use-push-device";

/**
 * Mounted once for the whole signed-in app. It checks on load that this device's push
 * subscription belongs to the current login (the hook's mount logic keeps a recognised
 * subscription and drops an unrecognised one), and closes cheer notifications still on the
 * lock screen: on load, and once today is read (the server closes the nudge then too).
 * Living here rather than on one screen, it also covers reading from the day page.
 */
export function PushSessionCheck({ publicKey }: { publicKey: string | null }) {
  usePushDevice(publicKey);
  const { today, completionLookup } = useReadingData();
  const todayDone = completionLookup.has(today);

  // biome-ignore lint/correctness/useExhaustiveDependencies: todayDone is the re-run trigger, the effect body does not read it
  useEffect(() => {
    void clearCheerNotifications().catch(() => {});
  }, [todayDone]);

  return null;
}
