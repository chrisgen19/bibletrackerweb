import { z } from "zod";

/**
 * The only place feature code may read `process.env`.
 *
 * Validated once at startup so a missing or malformed variable fails loudly at boot
 * rather than as a confusing database error on the first request.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error:
      "DATABASE_URL must be a postgres:// or postgresql:// connection URL.",
  }),
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
