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

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(100, "Use 100 characters or fewer."),
  email,
  password: z
    .string()
    .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
    .max(PASSWORD_MAX, `Use ${PASSWORD_MAX} characters or fewer.`),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
