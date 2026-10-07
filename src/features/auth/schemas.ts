import { z } from "zod";

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

const namePart = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter your ${label}.`)
    .max(50, "Use 50 characters or fewer.");

const passwords = z.object({
  password: z
    .string()
    .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
    .max(PASSWORD_MAX, `Use ${PASSWORD_MAX} characters or fewer.`),
  confirmPassword: z.string(),
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
    ...passwords.shape,
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
    // Zod skips an object refinement once any field has failed. Run it whenever the two
    // passwords themselves are readable, so a mismatch shows alongside other mistakes.
    when: (payload) => passwords.safeParse(payload.value).success,
  });

/** "Ruth Moabite": what Better Auth stores and the account menu shows. */
export function fullName(values: Pick<SignUpValues, "firstName" | "lastName">) {
  return `${values.firstName} ${values.lastName}`;
}

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
