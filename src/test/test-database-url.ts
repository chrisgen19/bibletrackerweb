/**
 * The database the `db` test project runs against.
 *
 * `TEST_DATABASE_URL` when set; otherwise the dev `DATABASE_URL` with `_test` appended to
 * the database name, on the same server. Never the dev database itself: the setup
 * clears tables, so it refuses any database whose name does not end in `_test`.
 */
export function getTestDatabaseUrl(
  source: Record<string, string | undefined> = process.env,
): string {
  const explicit = source.TEST_DATABASE_URL;
  const url = explicit
    ? new URL(explicit)
    : withDatabaseSuffix(requireDatabaseUrl(source), "_test");
  assertTestDatabaseName(url);
  return url.toString();
}

function requireDatabaseUrl(source: Record<string, string | undefined>): URL {
  const value = source.DATABASE_URL;
  if (!value) {
    throw new Error(
      "Database tests need DATABASE_URL (see .env.example) or TEST_DATABASE_URL.",
    );
  }
  return new URL(value);
}

function withDatabaseSuffix(url: URL, suffix: string): URL {
  const next = new URL(url);
  next.pathname = `/${next.pathname.slice(1)}${suffix}`;
  return next;
}

export function getDatabaseName(url: URL): string {
  return decodeURIComponent(url.pathname.slice(1));
}

function assertTestDatabaseName(url: URL): void {
  const name = getDatabaseName(url);
  if (!/^[a-z0-9_]+_test$/.test(name)) {
    throw new Error(
      `Refusing to run database tests against "${name}": the name must end in _test.`,
    );
  }
}
