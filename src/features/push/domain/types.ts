export interface PushSubscriptionInput {
  readonly endpoint: string;
  readonly keys: { readonly p256dh: string; readonly auth: string };
}
export type PushAvailability =
  | "available"
  | "needs-install"
  | "unsupported"
  | "not-phone";
export type PushDeviceStatus =
  | "loading"
  | "not-configured"
  | "not-phone"
  | "needs-install"
  | "unsupported"
  | "blocked"
  | "off"
  | "on";
export type TurnOnOutcome = "on" | "blocked" | "dismissed" | "failed";
export interface CheerNotification {
  readonly title: string;
  readonly tag: "cheers";
  readonly renotify: true;
  readonly icon: "/icons/icon-192.png";
  readonly data: { readonly url: "/" };
}
export type PushResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: "invalid-input" | "not-found" };
export type RefreshResult =
  | { readonly ok: true; readonly current: boolean }
  | { readonly ok: false; readonly error: "invalid-input" };
