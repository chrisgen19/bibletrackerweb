/**
 * Plain-language copy for a Better Auth error, never the raw server message.
 *
 * Codes come from @better-auth/core's error codes. Sign-in deliberately does not say
 * whether the email or the password was wrong.
 */
export function authErrorMessage(
  error: { code?: string; status?: number } | null | undefined,
): string {
  switch (error?.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_PASSWORD":
      return "That email and password don't match. Try again.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "An account with that email already exists. Sign in instead.";
    case "INVALID_EMAIL":
      return "Enter a valid email address.";
    case "PASSWORD_TOO_SHORT":
      return "That password is too short.";
    case "PASSWORD_TOO_LONG":
      return "That password is too long.";
  }
  if (error?.status === 429) {
    return "Too many attempts. Wait a minute and try again.";
  }
  return "Something went wrong. Check your connection and try again.";
}

/**
 * Copy for a Google round trip that came back to sign-in, from the `error` code Better
 * Auth adds to the URL.
 *
 * `account_not_linked` means an email + password account already uses this address.
 * Better Auth refuses to attach Google to it at sign-in because that email was never
 * verified (see `requireLocalEmailVerified` in src/lib/auth.ts). Signed in with the
 * password, the reader can connect Google from Settings, which proves both sides.
 */
export function oauthErrorMessage(error: string | undefined): string {
  if (error === "account_not_linked") {
    return "An account with this email already exists. Sign in with your password, then connect Google in Settings to use it next time.";
  }
  return "Google sign-in didn't complete. Try again.";
}

/**
 * Copy for a "Connect Google" round trip that came back to Settings with an `error`
 * code (Better Auth's OAuth callback codes, or Google's own, such as `access_denied`).
 */
export function googleLinkErrorMessage(error: string): string {
  switch (error) {
    case "email_does_not_match":
      return "That Google account uses a different email. Connect the Google account with the same email as this one.";
    case "account_already_linked_to_different_user":
      return "That Google account is already connected to another Bible Daily account.";
    case "access_denied":
      return "Google wasn't connected. You can try again any time.";
  }
  return "Google couldn't be connected. Try again.";
}
