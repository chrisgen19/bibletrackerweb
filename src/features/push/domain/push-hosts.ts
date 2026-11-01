const PUSH_SERVICE_HOSTS = ["fcm.googleapis.com", "android.googleapis.com"];
const PUSH_SERVICE_SUFFIXES = [
  "push.services.mozilla.com",
  "push.apple.com",
  "notify.windows.com",
];

/**
 * Whether `value` is an endpoint of a real browser push service (Chrome and Android FCM,
 * Firefox, Safari and iOS, Edge). The server POSTs to a stored endpoint, so only browser
 * push services are allowed: internal hosts, IPs and other sites are refused.
 */
export const isPushServiceUrl = (value: string): boolean => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.port !== "") return false;
  if (url.username !== "" || url.password !== "") return false;
  const host = url.hostname.toLowerCase();
  return (
    PUSH_SERVICE_HOSTS.includes(host) ||
    PUSH_SERVICE_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    )
  );
};
