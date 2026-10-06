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
