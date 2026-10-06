import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

/** Pages a signed-out visitor may see. */
const PUBLIC_PATHS = ["/sign-in", "/sign-up"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Sends visitors without a session cookie to sign-in.
 *
 * Optimistic only: it checks that a cookie exists, not that the session is valid. Pages
 * and Server Actions confirm the session with `requireUser()`. For the same reason it
 * never redirects *away* from sign-in because a cookie exists: an expired cookie would
 * bounce between `/` and `/sign-in` forever. The sign-in page checks the real session.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  if (isPublicPath(pathname) || getSessionCookie(request) !== null) {
    return NextResponse.next();
  }

  const signIn = new URL("/sign-in", request.url);
  if (pathname !== "/") signIn.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: [
    // Everything except API routes (they answer with status codes, not redirects),
    // Next.js internals, and static files.
    "/((?!api/|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
