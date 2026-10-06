import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";

export interface SessionUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly image: string | null;
}

/**
 * The signed-in user for this request, or `null`.
 *
 * This is the real check: it validates the session against the database. The proxy's
 * cookie check only decides where to send a visitor and must never be trusted alone.
 * Cached per request, so a layout and its page share one lookup.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session === null) return null;
  const { id, name, email, image } = session.user;
  return { id, name, email, image: image ?? null };
});

/**
 * The signed-in user, or a redirect to sign-in.
 *
 * Call it at the top of every protected page, layout and Server Action: Server Actions
 * are POSTs to the page's route, so they must check for themselves.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (user === null) redirect("/sign-in");
  return user;
}
