/** The first value of a search param, which Next.js gives as a string or an array. */
export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Where to send the reader after signing in, from a `?next=` parameter.
 *
 * Only same-site paths are allowed. Anything else (an absolute URL, a protocol-relative
 * `//host`, a backslash that some browsers treat as a slash) falls back to the home page,
 * so the parameter cannot be used to bounce a reader to another site.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (typeof next !== "string" || next.length === 0) return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return "/";
  }
  // Never send a signed-in reader back to the auth screens.
  if (/^\/(sign-in|sign-up)(\/|\?|$)/.test(next)) return "/";
  return next;
}
