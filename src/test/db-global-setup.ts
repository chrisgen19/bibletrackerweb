import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { Client } from "pg";

import { getDatabaseName, getTestDatabaseUrl } from "./test-database-url";

// Postgres SQLSTATE codes.
const INVALID_CATALOG_NAME = "3D000"; // the database does not exist
const DUPLICATE_DATABASE = "42P04";

/**
 * Runs once before the `db` test project: creates the test database if it is missing,
 * applies every migration (the same `migrate deploy` production runs), and clears the
 * tables left by the previous run. Tests then create their own readers, so files can run
 * in parallel without stepping on each other.
 */
export default async function setup(): Promise<void> {
  const url = new URL(getTestDatabaseUrl());
  const name = getDatabaseName(url);

  // Connect to the test database itself first. The maintenance database is only needed
  // to create it, so a CI role limited to an already-provisioned database still works.
  if (!(await databaseExists(url))) await createDatabase(url, name);

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

/** False only when Postgres reports that the database does not exist. */
async function databaseExists(url: URL): Promise<boolean> {
  const client = new Client({ connectionString: url.toString() });
  try {
    await client.connect();
  } catch (error) {
    if (hasCode(error, INVALID_CATALOG_NAME)) return false;
    throw unreachable(url, error);
  }
  await client.end();
  return true;
}

async function createDatabase(url: URL, name: string): Promise<void> {
  const admin = new URL(url);
  admin.pathname = "/postgres";
  await withClient(admin, async (client) => {
    try {
      // `name` is checked against ^[a-z0-9_]+_test$, so it is safe to inline.
      await client.query(`CREATE DATABASE "${name}"`);
    } catch (error) {
      // Another run created it in the meantime: that is the state we wanted.
      if (!hasCode(error, DUPLICATE_DATABASE)) throw error;
    }
  });
}

async function withClient<T>(
  url: URL,
  run: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client({ connectionString: url.toString() });
  try {
    await client.connect();
  } catch (error) {
    throw unreachable(url, error);
  }
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

function hasCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

function unreachable(url: URL, error: unknown): Error {
  const reason = error instanceof Error ? error.message : String(error);
  return new Error(
    `Database tests could not connect to "${getDatabaseName(url)}" at ${url.host} (${reason}). ` +
      "Start Postgres with `pnpm db:up`, or check TEST_DATABASE_URL.",
    { cause: error },
  );
}
