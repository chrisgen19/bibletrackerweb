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

/** One Better Auth session lookup per request, shared by the readers below. */
const getAuthSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

/**
 * The signed-in user for this request, or `null`.
 *
 * This is the real check: it validates the session against the database. The proxy's
 * cookie check only decides where to send a visitor and must never be trusted alone.
 * Cached per request, so a layout and its page share one lookup.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getAuthSession();
  if (session === null) return null;
  const { id, name, email, image } = session.user;
  return { id, name, email, image: image ?? null };
});

/**
 * The id of this request's login session, or `null`. Push subscriptions are tied to it,
 * so a device stops receiving cheers when the session ends.
 */
export const getCurrentSessionId = cache(async (): Promise<string | null> => {
  const session = await getAuthSession();
  return session === null ? null : session.session.id;
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

export interface SignInMethods {
  /** An email + password account: Settings offers to change the password. */
  readonly password: boolean;
  /** Google is connected: Settings shows it instead of the Connect button. */
  readonly google: boolean;
}

/**
 * How the signed-in reader can sign in, as Settings shows it. Asked of Better Auth, which
 * reads the session's own accounts.
 */
export async function getSignInMethods(): Promise<SignInMethods> {
  const accounts = await auth.api.listUserAccounts({
    headers: await headers(),
  });
  const providers = new Set(accounts.map((account) => account.providerId));
  return {
    password: providers.has("credential"),
    google: providers.has("google"),
  };
}
