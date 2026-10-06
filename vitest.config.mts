import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Next.js loads .env for the app; tests import the same modules, so load it here too.
// `src/lib/env.ts` validates at import time, and CI provides the variables directly.
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
});
