"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  deletePushSubscription,
  refreshPushSubscription,
  savePushSubscription,
} from "@/actions/push";
import {
  currentSubscription,
  sameKey,
  subscribeDevice,
  toSubscriptionInput,
  unsubscribeDevice,
} from "@/features/push/browser/push-client";
import { isPhone, pushAvailability } from "@/features/push/domain/device";
import type {
  PushAvailability,
  PushDeviceStatus,
  TurnOnOutcome,
} from "@/features/push/domain/types";

type NavigatorWithUaData = Navigator & {
  userAgentData?: { mobile: boolean };
};

/** What this browser supports, before looking at permission or subscriptions. */
const readSupport = (): PushAvailability => {
  if (typeof window === "undefined") return "unsupported";
  const nav = navigator as NavigatorWithUaData;
  const availability = pushAvailability({
    phone: isPhone(nav),
    serviceWorker: "serviceWorker" in nav,
    pushManager: "PushManager" in window,
    ios: /iPhone/.test(nav.userAgent),
  });
  if (availability !== "available") return availability;
  // Push without the Notification API cannot ask for permission.
  return "Notification" in window ? "available" : "unsupported";
};

/**
 * The app-load check: an existing subscription the server still holds under this session
 * stays on; one it does not (the session that saved it has ended) is unsubscribed here.
 * Never creates a subscription, even when permission is already granted.
 */
async function checkDevice(
  publicKey: string | null,
): Promise<PushDeviceStatus> {
  if (publicKey === null) return "not-configured";
  const support = readSupport();
  if (support !== "available") return support;
  if (Notification.permission === "denied") return "blocked";
  try {
    const subscription = await currentSubscription();
    if (subscription === null) return "off";
    // After a VAPID key change, a subscription made with the old key gets 403 from the
    // push service forever: drop it so the switch is honest and can be turned on again.
    if (
      sameKey(subscription.options?.applicationServerKey ?? null, publicKey) ===
      false
    ) {
      await subscription.unsubscribe();
      await deletePushSubscription({ endpoint: subscription.endpoint }).catch(
        () => {},
      );
      return "off";
    }
    const result = await refreshPushSubscription(
      toSubscriptionInput(subscription),
    );
    if (result.ok && result.current) return "on";
    if (result.ok) await subscription.unsubscribe();
    return "off";
  } catch {
    // Offline or a broken subscription: show the switch off and leave the browser alone.
    return "off";
  }
}

/** Asks for permission, subscribes and saves. Any failure is reported, never thrown. */
async function requestPush(publicKey: string | null): Promise<TurnOnOutcome> {
  if (publicKey === null) return "failed";
  try {
    const permission = await Notification.requestPermission();
    if (permission === "denied") return "blocked";
    if (permission !== "granted") return "dismissed";
    const result = await savePushSubscription(await subscribeDevice(publicKey));
    return result.ok ? "on" : "failed";
  } catch {
    return "failed";
  }
}

/** Removes this browser's subscription, then the server row. Never throws. */
async function removePush(): Promise<void> {
  try {
    const endpoint = await unsubscribeDevice();
    if (endpoint !== null) await deletePushSubscription({ endpoint });
  } catch {
    // The browser side is what stops the pushes; the server row ends with the session.
  }
}

/**
 * This device's push state, shared by the Today question, the Settings switch and the
 * app-load check. Starts `"loading"` and reads the browser only after mount, so the
 * server and first client render match.
 *
 * `turnOn` asks for permission and subscribes; a second call while one is running
 * returns the same promise, so it saves once. `turnOff` always ends `"off"`.
 */
export function usePushDevice(publicKey: string | null): {
  status: PushDeviceStatus;
  turnOn: () => Promise<TurnOnOutcome>;
  turnOff: () => Promise<void>;
} {
  const [status, setStatus] = useState<PushDeviceStatus>("loading");
  const turningOn = useRef<Promise<TurnOnOutcome> | null>(null);

  useEffect(() => {
    let active = true;
    void checkDevice(publicKey).then((next) => {
      // A turnOn or turnOff that finished first has the newer answer.
      if (active) setStatus((prev) => (prev === "loading" ? next : prev));
    });
    return () => {
      active = false;
    };
  }, [publicKey]);

  const turnOn = useCallback((): Promise<TurnOnOutcome> => {
    if (turningOn.current !== null) return turningOn.current;
    const running = requestPush(publicKey).then((outcome) => {
      if (outcome === "on") setStatus("on");
      if (outcome === "blocked") setStatus("blocked");
      // "dismissed" and "failed" leave the status as it was ("off").
      return outcome;
    });
    turningOn.current = running;
    void running.finally(() => {
      turningOn.current = null;
    });
    return running;
  }, [publicKey]);

  const turnOff = useCallback(async (): Promise<void> => {
    await removePush();
    setStatus("off");
  }, []);

  return { status, turnOn, turnOff };
}
