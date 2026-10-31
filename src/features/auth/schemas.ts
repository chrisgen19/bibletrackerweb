import { z } from "zod";

import { usernameSchema } from "@/features/friends/domain/username";

// Mirrors the limits configured in src/lib/auth.ts, so the form catches them before the
// server does.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

// Trim and lowercase before validating: Zod checks a format before later transforms, so
// a pasted address with a trailing space would otherwise be rejected.
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

const NAME_PART_MAX = 50;

/** A full name from sign-up: two parts and the space between them. */
const NAME_MAX = NAME_PART_MAX * 2 + 1;

const namePart = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter your ${label}.`)
    .max(NAME_PART_MAX, `Use ${NAME_PART_MAX} characters or fewer.`);

const passwords = z.object({
  password: z
    .string()
    .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
    .max(PASSWORD_MAX, `Use ${PASSWORD_MAX} characters or fewer.`),
  confirmPassword: z.string(),
});

function passwordsMatch(values: z.infer<typeof passwords>): boolean {
  return values.password === values.confirmPassword;
}

/** Where a mismatch shows, on every form that asks for a new password twice. */
const CONFIRMATION = {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
  // Zod skips an object refinement once any field has failed. Run it whenever the two
  // passwords themselves are readable, so a mismatch shows alongside other mistakes.
  when: (payload: z.core.ParsePayload) =>
    passwords.safeParse(payload.value).success,
};

/**
 * Optional at sign-up: blank means "pick one later", which the Friends screen asks for.
 * Anything typed must pass the same rules as the Friends step, and comes out normalised.
 */
const optionalUsername = z
  .string()
  .optional()
  .transform((raw, ctx) => {
    if (raw === undefined || raw.trim() === "") return undefined;
    const parsed = usernameSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
    for (const issue of parsed.error.issues) {
      ctx.addIssue({ code: "custom", message: issue.message });
    }
    return z.NEVER;
  });

/**
 * The sign-up form. The two names are stored together as Better Auth's single `name`
 * (see `fullName`), and the confirmation never leaves the browser.
 */
export const signUpSchema = z
  .object({
    firstName: namePart("first name"),
    lastName: namePart("last name"),
    email,
    username: optionalUsername,
    ...passwords.shape,
  })
  .refine(passwordsMatch, CONFIRMATION);

/**
 * Settings' name editor. One field, not sign-up's two: a stored name cannot be split back
 * reliably ("Juan dela Cruz"), and only the full name is ever shown.
 */
export const editNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(NAME_MAX, "That name is too long."),
});

/** Settings' password change. `password` is the new one, so it shares sign-up's rules. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    ...passwords.shape,
  })
  .refine(passwordsMatch, CONFIRMATION);

/** "Ruth Moabite": what Better Auth stores and the account menu shows. */
export function fullName(values: Pick<SignUpValues, "firstName" | "lastName">) {
  return `${values.firstName} ${values.lastName}`;
}

export type SignInValues = z.infer<typeof signInSchema>;
/** What the sign-up fields hold, before `username` is normalised. */
export type SignUpInput = z.input<typeof signUpSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type EditNameValues = z.infer<typeof editNameSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
