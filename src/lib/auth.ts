import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { setTimeZone } from "@/lib/dal";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { TIME_ZONE_COOKIE } from "@/lib/time-zone-cookie";
import { isValidTimeZone } from "@/utils/zoned-date-key";

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
  databaseHooks: {
    user: {
      create: {
        // A new account starts in the zone of the device it signed up on, which the
        // sign-up screen puts in a cookie (DeviceTimeZone). Runs after the user is
        // committed, for email and Google sign-up alike. Best effort: the browser
        // reports its zone again once the app loads, so a failure here only logs.
        after: async (user, ctx) => {
          const zone = ctx?.getCookie(TIME_ZONE_COOKIE);
          if (zone == null || !isValidTimeZone(zone)) return;
          try {
            await setTimeZone(user.id, zone);
          } catch (error) {
            ctx?.context.logger.error(
              "Could not store the new account's timezone",
              error,
            );
          }
        },
      },
    },
  },
  // Lets Server Actions set the session cookie. Better Auth requires it to be last.
  plugins: [nextCookies()],
});
