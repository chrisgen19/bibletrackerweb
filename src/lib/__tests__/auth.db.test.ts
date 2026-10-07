// Better Auth against the real schema, driven through its HTTP handler: the same path a
// browser takes through src/app/api/auth/[...all]/route.ts.
import { describe, expect, it } from "vitest";

import { auth } from "@/lib/auth";
import {
  createReadingPlan,
  getActiveReadingPlan,
  getTimeZone,
  markReadingComplete,
} from "@/lib/dal";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { makeDraft } from "@/test/factories";
import { createId } from "@/utils/id";

const ORIGIN = env.BETTER_AUTH_URL;
const PASSWORD = "correct horse battery";

function call(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  cookie?: string,
) {
  const headers: Record<string, string> = { origin: ORIGIN };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (cookie !== undefined) headers.cookie = cookie;
  return auth.handler(
    new Request(`${ORIGIN}/api/auth${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

/** The session cookie a response set, ready to send back as a Cookie header. */
function sessionCookie(response: Response): string {
  const cookie = response.headers
    .getSetCookie()
    .find((value) => value.startsWith("better-auth.session_token="));
  if (cookie === undefined) throw new Error("No session cookie was set.");
  return cookie.split(";")[0] ?? "";
}

async function signUp(email = `reader-${createId()}@example.test`) {
  const response = await call("POST", "/sign-up/email", {
    name: "Test Reader",
    email,
    password: PASSWORD,
  });
  const body = (await response.json()) as { user?: { id: string } };
  return { response, email, userId: body.user?.id ?? "" };
}

describe("sign-up", () => {
  it("creates the user in our schema and signs them in", async () => {
    const { response, email, userId } = await signUp();
    expect(response.status).toBe(200);
    expect(sessionCookie(response)).toMatch(/^better-auth\.session_token=/);

    expect(await db.user.findUnique({ where: { id: userId } })).toMatchObject({
      email,
      name: "Test Reader",
      emailVerified: false,
    });
    expect(await db.session.count({ where: { userId } })).toBe(1);
  });

  it("stores a password hash, never the password", async () => {
    const { userId } = await signUp();
    const account = await db.account.findFirst({
      where: { userId, providerId: "credential" },
    });
    expect(account?.password).toBeTruthy();
    expect(account?.password).not.toContain(PASSWORD);
  });

  it("refuses a second account for the same email", async () => {
    const { email } = await signUp();
    const again = await signUp(email);
    expect(again.response.status).toBeGreaterThanOrEqual(400);
    expect(await db.user.count({ where: { email } })).toBe(1);
  });

  // The sign-up screen sets the tz cookie (DeviceTimeZone); without this the account had
  // no zone until the app had loaded once, so its first page was worked out in UTC.
  it("starts the account in the zone of the device it signed up on", async () => {
    const response = await call(
      "POST",
      "/sign-up/email",
      {
        name: "Test Reader",
        email: `reader-${createId()}@example.test`,
        password: PASSWORD,
      },
      `tz=${encodeURIComponent("Asia/Manila")}`,
    );
    expect(response.status).toBe(200);
    const { user } = (await response.json()) as { user: { id: string } };

    expect(await getTimeZone(user.id)).toBe("Asia/Manila");
  });

  it("signs up without a zone when the cookie is missing or not a real zone", async () => {
    const { userId } = await signUp();
    expect(await getTimeZone(userId)).toBeNull();

    const response = await call(
      "POST",
      "/sign-up/email",
      {
        name: "Test Reader",
        email: `reader-${createId()}@example.test`,
        password: PASSWORD,
      },
      "tz=Mars%2FBase",
    );
    expect(response.status).toBe(200);
    const { user } = (await response.json()) as { user: { id: string } };
    expect(await getTimeZone(user.id)).toBeNull();
  });

  it("refuses a password shorter than 8 characters", async () => {
    const response = await call("POST", "/sign-up/email", {
      name: "Test Reader",
      email: `reader-${createId()}@example.test`,
      password: "short",
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "PASSWORD_TOO_SHORT" });
  });
});

describe("sign-in and sessions", () => {
  it("refuses the wrong password without saying which field was wrong", async () => {
    const { email } = await signUp();
    const response = await call("POST", "/sign-in/email", {
      email,
      password: "not the password",
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      code: "INVALID_EMAIL_OR_PASSWORD",
    });
  });

  it("signs in, resolves the session, and signs out", async () => {
    const { email } = await signUp();
    const signedIn = await call("POST", "/sign-in/email", {
      email,
      password: PASSWORD,
    });
    expect(signedIn.status).toBe(200);
    const cookie = sessionCookie(signedIn);

    const session = await call("GET", "/get-session", undefined, cookie);
    expect(await session.json()).toMatchObject({ user: { email } });

    const signedOut = await call("POST", "/sign-out", {}, cookie);
    expect(signedOut.status).toBe(200);
    const after = await call("GET", "/get-session", undefined, cookie);
    expect(await after.json()).toBeNull();
  });
});

describe("a Better Auth user and their reading data", () => {
  it("owns reading data through the DAL", async () => {
    const { userId } = await signUp();
    const plan = await createReadingPlan(userId, makeDraft());
    expect((await getActiveReadingPlan(userId))?.id).toBe(plan.id);
  });

  it("takes sessions, accounts and reading data with them when deleted", async () => {
    const { userId } = await signUp();
    const plan = await createReadingPlan(userId, makeDraft());
    await markReadingComplete(userId, {
      readingPlanId: plan.id,
      localDate: "2026-08-01",
      chapters: [{ bookId: "GEN", chapter: 1 }],
    });

    await db.user.delete({ where: { id: userId } });

    expect(await db.session.count({ where: { userId } })).toBe(0);
    expect(await db.account.count({ where: { userId } })).toBe(0);
    expect(await db.readingPlan.count({ where: { userId } })).toBe(0);
    expect(await db.readingCompletion.count({ where: { userId } })).toBe(0);
  });
});
