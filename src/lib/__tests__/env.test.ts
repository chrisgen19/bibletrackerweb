import { describe, expect, it } from "vitest";

import { EXAMPLE_AUTH_SECRET, parseEnv } from "../env";

const VALID_URL =
  "postgresql://bibletracker:bibletracker@localhost:5434/bibletracker";
// Deliberately low-entropy and obviously fake: 48 characters, long enough to be valid,
// and nothing a secret scanner should mistake for a real credential.
const TEST_SECRET = "test-secret-".repeat(4);

/** A complete, valid environment; each test overrides what it is about. */
function source(overrides: Record<string, string | undefined> = {}) {
  return {
    DATABASE_URL: VALID_URL,
    BETTER_AUTH_SECRET: TEST_SECRET,
    BETTER_AUTH_URL: "http://localhost:3100",
    ...overrides,
  };
}

describe("parseEnv: database", () => {
  it("accepts a postgresql:// URL and defaults NODE_ENV", () => {
    const env = parseEnv(source());
    expect(env.DATABASE_URL).toBe(VALID_URL);
    expect(env.NODE_ENV).toBe("development");
  });

  it("accepts the postgres:// scheme with query parameters", () => {
    const url = "postgres://user:secret@db.example.com/app?sslmode=require";
    expect(
      parseEnv(source({ DATABASE_URL: url, NODE_ENV: "production" }))
        .DATABASE_URL,
    ).toBe(url);
  });

  it("rejects a missing DATABASE_URL and names the variable", () => {
    expect(() => parseEnv(source({ DATABASE_URL: undefined }))).toThrow(
      /DATABASE_URL/,
    );
  });

  it("rejects a non-postgres URL", () => {
    expect(() =>
      parseEnv(source({ DATABASE_URL: "https://example.com" })),
    ).toThrow(/postgres:\/\/ or postgresql:\/\//);
  });

  it("does not echo the connection string in the error", () => {
    const leaky = "mysql://user:hunter2@localhost/db";
    expect(() => parseEnv(source({ DATABASE_URL: leaky }))).toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining("hunter2"),
      }),
    );
  });
});

describe("parseEnv: auth", () => {
  it("requires a secret of at least 32 characters", () => {
    expect(() => parseEnv(source({ BETTER_AUTH_SECRET: undefined }))).toThrow(
      /BETTER_AUTH_SECRET is required/,
    );
    expect(() => parseEnv(source({ BETTER_AUTH_SECRET: "too-short" }))).toThrow(
      /at least 32 characters/,
    );
  });

  it("never echoes the secret", () => {
    expect(() => parseEnv(source({ BETTER_AUTH_SECRET: "hunter2" }))).toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining("hunter2"),
      }),
    );
  });

  it("accepts the .env.example placeholder outside production", () => {
    for (const NODE_ENV of ["development", "test"]) {
      expect(
        parseEnv(source({ NODE_ENV, BETTER_AUTH_SECRET: EXAMPLE_AUTH_SECRET }))
          .BETTER_AUTH_SECRET,
      ).toBe(EXAMPLE_AUTH_SECRET);
    }
  });

  it("refuses the .env.example placeholder in production", () => {
    expect(() =>
      parseEnv(
        source({
          NODE_ENV: "production",
          BETTER_AUTH_SECRET: EXAMPLE_AUTH_SECRET,
        }),
      ),
    ).toThrow(/still the .env.example placeholder/);
  });

  it("requires BETTER_AUTH_URL to be an http(s) origin", () => {
    expect(() => parseEnv(source({ BETTER_AUTH_URL: undefined }))).toThrow(
      /BETTER_AUTH_URL/,
    );
    expect(() =>
      parseEnv(source({ BETTER_AUTH_URL: "ftp://localhost" })),
    ).toThrow(/http\(s\) origin/);
  });
});

describe("parseEnv: Google sign-in", () => {
  it("is optional, and treats empty strings as unset", () => {
    const env = parseEnv(
      source({ GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "" }),
    );
    expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
    expect(env.GOOGLE_CLIENT_SECRET).toBeUndefined();
  });

  it("accepts both values together", () => {
    const env = parseEnv(
      source({ GOOGLE_CLIENT_ID: "id.apps", GOOGLE_CLIENT_SECRET: "secret" }),
    );
    expect(env.GOOGLE_CLIENT_ID).toBe("id.apps");
  });

  it("rejects half a configuration and names the missing half", () => {
    expect(() => parseEnv(source({ GOOGLE_CLIENT_ID: "id.apps" }))).toThrow(
      /GOOGLE_CLIENT_SECRET: Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET together/,
    );
    expect(() => parseEnv(source({ GOOGLE_CLIENT_SECRET: "secret" }))).toThrow(
      /GOOGLE_CLIENT_ID: Set/,
    );
  });
});

describe("parseEnv: web push", () => {
  // Obviously fake, low-entropy keys of the right shape (65 and 32 bytes, base64url).
  // parseEnv checks format and length only, so no real key pair is needed here, and
  // none is committed for secret scanners to flag.
  const TEST_PUBLIC_KEY = Buffer.alloc(65, 4).toString("base64url");
  const TEST_PRIVATE_KEY = Buffer.alloc(32, 7).toString("base64url");
  const VAPID = {
    VAPID_PUBLIC_KEY: TEST_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: TEST_PRIVATE_KEY,
    VAPID_SUBJECT: "mailto:hello@example.test",
  };

  it("accepts no VAPID variables", () => {
    const env = parseEnv(source());
    expect(env.VAPID_PUBLIC_KEY).toBeUndefined();
    expect(env.VAPID_PRIVATE_KEY).toBeUndefined();
    expect(env.VAPID_SUBJECT).toBeUndefined();
  });

  it("accepts all three", () => {
    const env = parseEnv(source(VAPID));
    expect(env.VAPID_PUBLIC_KEY).toBe(TEST_PUBLIC_KEY);
    expect(env.VAPID_PRIVATE_KEY).toBe(TEST_PRIVATE_KEY);
    expect(env.VAPID_SUBJECT).toBe("mailto:hello@example.test");
  });

  it("rejects a partial set and names the missing variable", () => {
    expect(() =>
      parseEnv(source({ ...VAPID, VAPID_SUBJECT: undefined })),
    ).toThrow(/VAPID_SUBJECT/);
  });

  it("rejects a subject that is not mailto: or https:", () => {
    expect(() =>
      parseEnv(source({ ...VAPID, VAPID_SUBJECT: "hello@example.test" })),
    ).toThrow(/VAPID_SUBJECT/);
  });

  it.each([
    ["VAPID_PUBLIC_KEY", "too-short"],
    ["VAPID_PUBLIC_KEY", TEST_PRIVATE_KEY],
    ["VAPID_PRIVATE_KEY", TEST_PUBLIC_KEY],
    ["VAPID_PRIVATE_KEY", "not base64url!"],
  ])("rejects a %s of the wrong shape or length", (name, value) => {
    expect(() => parseEnv(source({ ...VAPID, [name]: value }))).toThrow(
      new RegExp(`${name} must be the base64url`),
    );
  });

  it.each([
    ["padding", `${TEST_PRIVATE_KEY}=`],
    ["quotes", `"${TEST_PRIVATE_KEY}"`],
  ])("rejects a private key with %s", (_label, value) => {
    expect(() =>
      parseEnv(source({ ...VAPID, VAPID_PRIVATE_KEY: value })),
    ).toThrow(/VAPID_PRIVATE_KEY must be the base64url/);
  });

  it("treats empty strings as unset", () => {
    const env = parseEnv(
      source({
        VAPID_PUBLIC_KEY: "",
        VAPID_PRIVATE_KEY: "",
        VAPID_SUBJECT: "",
      }),
    );
    expect(env.VAPID_PUBLIC_KEY).toBeUndefined();
    expect(env.VAPID_SUBJECT).toBeUndefined();
  });
});
