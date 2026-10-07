import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
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
    alias: {
      "server-only": fileURLToPath(
        new URL("./src/test/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    // The domain suites are ported from bibletrackerapp (Jest) and use the global
    // describe/it/expect. Globals let them run unedited, which is the parity check.
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
          exclude: [
            "src/**/__tests__/**/*.db.test.ts",
            "src/**/__tests__/**/*.dom.test.tsx",
          ],
          // Everything under test talks to <name>_test, never the dev database.
          setupFiles: ["./src/test/test-env.ts"],
        },
      },
      {
        extends: true,
        test: {
          // Components in a browser-like DOM: bibletrackerapp's interaction tests, ported
          // from React Native Testing Library to React Testing Library.
          name: "dom",
          include: ["src/**/__tests__/**/*.dom.test.tsx"],
          environment: "jsdom",
          setupFiles: ["./src/test/test-env.ts", "./src/test/dom-setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          // Integration tests for the data layer, against a real Postgres. Start it
          // with `pnpm db:up`.
          name: "db",
          include: ["src/**/__tests__/**/*.db.test.ts"],
          globalSetup: ["./src/test/db-global-setup.ts"],
          setupFiles: ["./src/test/test-env.ts", "./src/test/db-setup.ts"],
        },
      },
    ],
  },
});
