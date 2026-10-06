import { describe, expect, it } from "vitest";

import { getTestDatabaseUrl } from "../test-database-url";

describe("getTestDatabaseUrl", () => {
  it("appends _test to the dev database name on the same server", () => {
    expect(
      getTestDatabaseUrl({
        DATABASE_URL:
          "postgresql://u:p@localhost:5434/bibletrackerweb?sslmode=disable",
      }),
    ).toBe(
      "postgresql://u:p@localhost:5434/bibletrackerweb_test?sslmode=disable",
    );
  });

  it("prefers TEST_DATABASE_URL", () => {
    expect(
      getTestDatabaseUrl({
        DATABASE_URL: "postgresql://u:p@localhost:5434/app",
        TEST_DATABASE_URL: "postgresql://u:p@ci:5432/ci_test",
      }),
    ).toBe("postgresql://u:p@ci:5432/ci_test");
  });

  it("refuses a database whose name does not end in _test", () => {
    // The setup clears tables, so pointing it at the dev database must be impossible.
    expect(() =>
      getTestDatabaseUrl({
        TEST_DATABASE_URL: "postgresql://u:p@localhost:5434/bibletrackerweb",
      }),
    ).toThrow(/must end in _test/);
  });

  it("explains what is missing when nothing is configured", () => {
    expect(() => getTestDatabaseUrl({})).toThrow(/DATABASE_URL/);
  });
});
