import { z } from "zod";

/**
 * The placeholder secret in `.env.example`. It lets a fresh clone run locally and in
 * tests, and is refused in production so it can never sign real sessions.
 */
export const EXAMPLE_AUTH_SECRET =
  "dev-only-secret-replace-me-with-openssl-rand-base64-32";

/** An optional variable where an empty string (as in `.env.example`) means unset. */
const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

/**
 * The only place feature code may read `process.env`.
 *
 * Validated once at startup so a missing or malformed variable fails loudly at boot
 * rather than as a confusing database or auth error on the first request.
 */
const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.url({
      protocol: /^postgres(ql)?$/,
      error:
        "DATABASE_URL must be a postgres:// or postgresql:// connection URL.",
    }),
    BETTER_AUTH_SECRET: z
      .string({ error: "BETTER_AUTH_SECRET is required." })
      .min(
        32,
        "BETTER_AUTH_SECRET must be at least 32 characters. Generate one with `openssl rand -base64 32`.",
      ),
    BETTER_AUTH_URL: z.url({
      protocol: /^https?$/,
      error:
        "BETTER_AUTH_URL must be the app's http(s) origin, e.g. http://localhost:3100.",
    }),
    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,
  })
  .superRefine((env, ctx) => {
    if (
      env.NODE_ENV === "production" &&
      env.BETTER_AUTH_SECRET === EXAMPLE_AUTH_SECRET
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_SECRET"],
        message:
          "BETTER_AUTH_SECRET is still the .env.example placeholder. Set a real secret in production.",
      });
    }
    // Half a Google configuration would show a button that can only fail.
    if (
      (env.GOOGLE_CLIENT_ID === undefined) !==
      (env.GOOGLE_CLIENT_SECRET === undefined)
    ) {
      ctx.addIssue({
        code: "custom",
        path: [
          env.GOOGLE_CLIENT_ID === undefined
            ? "GOOGLE_CLIENT_ID"
            : "GOOGLE_CLIENT_SECRET",
        ],
        message:
          "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET together, or leave both empty.",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Parses an environment source. Exported so the rules can be tested without `process.env`. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;

  const problems = result.error.issues
    .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${problems}`);
}

export const env = parseEnv(process.env);
