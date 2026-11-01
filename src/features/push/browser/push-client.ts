import { CHEERS_TAG } from "@/features/push/domain/notification";
import type { PushSubscriptionInput } from "@/features/push/domain/types";

// Browser-only helpers around the service worker and the Push API. Callers check
// support first (see usePushDevice); nothing here runs during a server render.

export const SW_URL = "/sw.js";

/** The VAPID public key (base64url) as bytes, as the bundled PWA guide converts it. */
const urlBase64ToUint8Array = (
  base64String: string,
): Uint8Array<ArrayBuffer> => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/** The endpoint and keys the Server Actions expect. Throws when the keys are missing. */
export const toSubscriptionInput = (
  subscription: PushSubscription,
): PushSubscriptionInput => {
  const { endpoint, keys } = subscription.toJSON();
  const p256dh = keys?.p256dh;
  const auth = keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    throw new Error("Push subscription is missing its endpoint or keys");
  }
  return { endpoint, keys: { p256dh, auth } };
};

/** Registers the push-only service worker and waits until it is active. */
export const registerServiceWorker =
  async (): Promise<ServiceWorkerRegistration> => {
    await navigator.serviceWorker.register(SW_URL, {
      scope: "/",
      updateViaCache: "none",
    });
    // pushManager.subscribe needs an active worker; `ready` resolves once there is one.
    return navigator.serviceWorker.ready;
  };

/** The existing registration, if any. Never registers. */
const existingRegistration = async (): Promise<
  ServiceWorkerRegistration | undefined
> => navigator.serviceWorker.getRegistration();

/** This browser's push subscription, or null. Never registers the service worker. */
export const currentSubscription =
  async (): Promise<PushSubscription | null> => {
    const registration = await existingRegistration();
    if (registration === undefined) return null;
    return registration.pushManager.getSubscription();
  };

/** Registers the service worker and subscribes this browser to push. */
export const subscribeDevice = async (
  publicKey: string,
): Promise<PushSubscriptionInput> => {
  const registration = await registerServiceWorker();
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  return toSubscriptionInput(subscription);
};

/** Unsubscribes this browser. Returns the endpoint it removed, or null if none. */
export const unsubscribeDevice = async (): Promise<string | null> => {
  const subscription = await currentSubscription();
  if (subscription === null) return null;
  const { endpoint } = subscription;
  await subscription.unsubscribe();
  return endpoint;
};

/** Closes any cheer notifications still showing. Does nothing without a registration. */
export const clearCheerNotifications = async (): Promise<void> => {
  const registration = await existingRegistration();
  if (registration === undefined) return;
  const notifications = await registration.getNotifications({
    tag: CHEERS_TAG,
  });
  for (const notification of notifications) notification.close();
};
