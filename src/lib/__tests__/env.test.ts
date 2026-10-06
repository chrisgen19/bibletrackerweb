import { describe, expect, it } from "vitest";

import { parseEnv } from "../env";

const VALID_URL =
  "postgresql://bibletracker:bibletracker@localhost:5434/bibletracker";

describe("parseEnv", () => {
  it("accepts a postgresql:// URL and defaults NODE_ENV", () => {
    const env = parseEnv({ DATABASE_URL: VALID_URL });
    expect(env.DATABASE_URL).toBe(VALID_URL);
    expect(env.NODE_ENV).toBe("development");
  });

  it("accepts the postgres:// scheme with query parameters", () => {
    const url = "postgres://user:secret@db.example.com/app?sslmode=require";
    expect(
      parseEnv({ DATABASE_URL: url, NODE_ENV: "production" }).DATABASE_URL,
    ).toBe(url);
  });

  it("rejects a missing DATABASE_URL and names the variable", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it("rejects a non-postgres URL", () => {
    expect(() => parseEnv({ DATABASE_URL: "https://example.com" })).toThrow(
      /postgres:\/\/ or postgresql:\/\//,
    );
  });

  it("does not echo the connection string in the error", () => {
    const leaky = "mysql://user:hunter2@localhost/db";
    expect(() => parseEnv({ DATABASE_URL: leaky })).toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining("hunter2"),
      }),
    );
  });
});
