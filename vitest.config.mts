import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Next.js loads .env for the app; tests import the same modules, so load it here too.
// `src/lib/env.ts` validates at import time, so without either file every test that
// touches it would fail to load. loadEnvFile never overrides variables that are already
// set, so CI-provided values still win over both files.
if (existsSync(".env")) process.loadEnvFile(".env");
else if (existsSync(".env.example")) process.loadEnvFile(".env.example");

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
});
