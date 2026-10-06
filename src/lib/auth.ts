import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/lib/db";
import { env } from "@/lib/env";

/** True when Google credentials are configured; the sign-in screens hide the button otherwise. */
export const googleSignInEnabled =
  env.GOOGLE_CLIENT_ID !== undefined && env.GOOGLE_CLIENT_SECRET !== undefined;

/**
 * Better Auth: email + password, and Google when configured.
 *
 * There is no email provider yet, so addresses are not verified and there is no password
 * reset by email. Google accounts are unaffected.
 */
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  // `transaction` makes sign-up create the user and its account row together or not at all.
  database: prismaAdapter(db, { provider: "postgresql", transaction: true }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  account: {
    accountLinking: {
      // Never attach a Google sign-in to an existing account whose email has not been
      // verified. Without email verification, anyone can sign up with someone else's
      // address; linking would then hand that password access to the real owner's
      // account. This is Better Auth 1.7's default, pinned so an upgrade cannot change it.
      requireLocalEmailVerified: true,
    },
  },
  socialProviders:
    env.GOOGLE_CLIENT_ID !== undefined && env.GOOGLE_CLIENT_SECRET !== undefined
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {},
  // Lets Server Actions set the session cookie. Better Auth requires it to be last.
  plugins: [nextCookies()],
});
