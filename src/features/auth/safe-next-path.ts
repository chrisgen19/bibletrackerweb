/** The first value of a search param, which Next.js gives as a string or an array. */
export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * A link to sign-in or sign-up that carries `next` along, so the reader still ends up
 * where they were going after switching screens or after a failed Google round trip.
 * `next` must already have been through `safeNextPath`.
 */
export function authHref(
  path: "/sign-in" | "/sign-up",
  next: string,
  extra: Record<string, string> = {},
): string {
  const params = new URLSearchParams(extra);
  if (next !== "/") params.set("next", next);
  const query = params.toString();
  return query === "" ? path : `${path}?${query}`;
}

/** An origin nothing runs on, used only to see where a path would resolve. */
const PROBE_ORIGIN = "http://next-path.invalid";

/**
 * Where to send the reader after signing in, from a `?next=` parameter.
 *
 * Only same-site paths are allowed; anything else falls back to the home page, so the
 * parameter cannot bounce a reader to another site. The path is resolved the way a
 * browser would and must stay on this site, and the normalised result is returned
 * rather than the raw input.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (typeof next !== "string" || next.length === 0) return "/";
  // Control characters first: URL parsing silently drops tab, CR and LF, so
  // "/\t/evil.example" would otherwise pass the checks below and become
  // "//evil.example". A backslash is treated as a slash by browsers.
  if (/[\p{Cc}\\]/u.test(next)) return "/";
  if (!next.startsWith("/") || next.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(next, PROBE_ORIGIN);
  } catch {
    return "/";
  }
  if (url.origin !== PROBE_ORIGIN) return "/";

  // Never send a signed-in reader back to the auth screens.
  if (/^\/(sign-in|sign-up)(\/|$)/.test(url.pathname)) return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}
