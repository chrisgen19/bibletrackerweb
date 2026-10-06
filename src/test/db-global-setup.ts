import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { Client } from "pg";

import { getDatabaseName, getTestDatabaseUrl } from "./test-database-url";

/**
 * Runs once before the `db` test project: creates the test database if it is missing,
 * applies every migration (the same `migrate deploy` production runs), and clears the
 * tables left by the previous run. Tests then create their own readers, so files can run
 * in parallel without stepping on each other.
 */
export default async function setup(): Promise<void> {
  const url = new URL(getTestDatabaseUrl());
  const name = getDatabaseName(url);

  const admin = new URL(url);
  admin.pathname = "/postgres";
  await withClient(admin, async (client) => {
    const found = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [name],
    );
    // `name` is checked against ^[a-z0-9_]+_test$, so it is safe to inline.
    if (found.rowCount === 0) await client.query(`CREATE DATABASE "${name}"`);
  });

  try {
    execFileSync(resolve("node_modules/.bin/prisma"), ["migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: url.toString() },
      stdio: "pipe",
    });
  } catch (error) {
    const output =
      error instanceof Error && "stderr" in error ? String(error.stderr) : "";
    throw new Error(`prisma migrate deploy failed on "${name}".\n${output}`, {
      cause: error,
    });
  }

  await withClient(url, (client) =>
    client.query(
      'TRUNCATE "user", "reading_plan", "reading_completion", "app_setting" CASCADE',
    ),
  );
}

async function withClient<T>(
  url: URL,
  run: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client({ connectionString: url.toString() });
  try {
    await client.connect();
  } catch (error) {
    throw new Error(
      `Database tests need Postgres at ${url.host}. Start it with \`pnpm db:up\`.`,
      { cause: error },
    );
  }
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}
