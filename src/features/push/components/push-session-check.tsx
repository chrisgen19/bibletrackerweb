"use client";

import { usePushDevice } from "../hooks/use-push-device";

/**
 * Checks on app load that this device's push subscription belongs to the current login.
 * The hook's mount logic does the work (keep a recognised subscription, drop an
 * unrecognised one); this only mounts it once for the whole signed-in app.
 */
export function PushSessionCheck({ publicKey }: { publicKey: string | null }) {
  usePushDevice(publicKey);
  return null;
}
