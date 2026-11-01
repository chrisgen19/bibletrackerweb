import type { PushAvailability } from "./types";

const PHONE_USER_AGENT = /iPhone|Android.*Mobile/;

/**
 * Whether this device counts as a phone. Uses `userAgentData.mobile` where the browser
 * has it (Chromium), else the user agent (Safari, Firefox). An iPad is not a phone: it
 * is out of scope and iPadOS reports a desktop user agent anyway.
 */
export const isPhone = (nav: {
  userAgent: string;
  userAgentData?: { mobile: boolean };
}): boolean =>
  nav.userAgentData === undefined
    ? PHONE_USER_AGENT.test(nav.userAgent)
    : nav.userAgentData.mobile;

/**
 * Whether this device can get push. An iPhone in Safari has no PushManager, which is how
 * "not added to the Home Screen" is detected.
 */
export const pushAvailability = (input: {
  phone: boolean;
  serviceWorker: boolean;
  pushManager: boolean;
  ios: boolean;
}): PushAvailability => {
  if (!input.phone) return "not-phone";
  if (input.serviceWorker && input.pushManager) return "available";
  if (input.ios && !input.pushManager) return "needs-install";
  return "unsupported";
};
