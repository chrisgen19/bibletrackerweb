import { describe, expect, it } from "vitest";

import { authHref, firstParam, safeNextPath } from "../safe-next-path";

describe("safeNextPath", () => {
  it.each([
    ["/", "/"],
    ["/day/2026-08-01", "/day/2026-08-01"],
    [
      "/day/2026-08-01?book=GEN&chapter=1",
      "/day/2026-08-01?book=GEN&chapter=1",
    ],
    ["/settings", "/settings"],
  ])("keeps the same-site path %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    "https://evil.example/phish",
    "//evil.example/phish",
    "/\\evil.example",
    "javascript:alert(1)",
    "settings",
    "",
  ])("sends %j home instead of following it", (input) => {
    expect(safeNextPath(input)).toBe("/");
  });

  // Review on #6: URL parsing drops tab, CR and LF, so these resolve to
  // "//evil.example". Reproduced in Chrome before the fix, on both the server redirect
  // and the client-side navigation after signing in.
  it.each([
    "/\t/evil.example",
    "/\n/evil.example",
    "/\r/evil.example",
    "/\t\t/evil.example/x?y=1",
    "/\u0000/evil.example",
    "/\u007f/evil.example",
  ])("sends %j home: control characters can hide a second slash", (input) => {
    expect(safeNextPath(input)).toBe("/");
  });

  it("keeps percent-encoded characters on this site", () => {
    // Encoded, the tab stays part of the path instead of being dropped.
    expect(safeNextPath("/%09/evil.example")).toBe("/%09/evil.example");
    expect(
      new URL(safeNextPath("/%09/evil.example"), "https://app.test").host,
    ).toBe("app.test");
  });

  it("returns the normalised path, not the raw input", () => {
    expect(safeNextPath("/a/../day/2026-08-01")).toBe("/day/2026-08-01");
    expect(safeNextPath("/settings#appearance")).toBe("/settings#appearance");
  });

  it.each([
    "/sign-in",
    "/sign-up",
    "/sign-in?next=/settings",
    "/sign-up/",
  ])("does not send a signed-in reader back to %s", (input) => {
    expect(safeNextPath(input)).toBe("/");
  });

  it("keeps paths that only start with the same letters", () => {
    expect(safeNextPath("/sign-in-help")).toBe("/sign-in-help");
  });

  it("defaults to home when there is no parameter", () => {
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath(null)).toBe("/");
  });
});

describe("authHref", () => {
  it("leaves out next when it is home", () => {
    expect(authHref("/sign-in", "/")).toBe("/sign-in");
    expect(authHref("/sign-up", "/")).toBe("/sign-up");
  });

  it("carries next to the other auth screen", () => {
    expect(authHref("/sign-up", "/settings")).toBe("/sign-up?next=%2Fsettings");
  });

  it("keeps next on the Google error return, after Better Auth adds its error", () => {
    // Review on #6: the error callback used to drop next, so a reader sent back to
    // use their password ended up on "/" instead of where they were going.
    const errorURL = authHref("/sign-in", "/day/2026-08-01?book=GEN", {
      oauth: "failed",
    });
    const returned = new URL(
      `${errorURL}&error=account_not_linked`,
      "http://localhost:3100",
    );
    expect(returned.searchParams.get("oauth")).toBe("failed");
    expect(returned.searchParams.get("error")).toBe("account_not_linked");
    expect(safeNextPath(returned.searchParams.get("next"))).toBe(
      "/day/2026-08-01?book=GEN",
    );
  });
});

describe("firstParam", () => {
  it("takes the first of repeated values", () => {
    expect(firstParam(["/a", "/b"])).toBe("/a");
    expect(firstParam("/a")).toBe("/a");
    expect(firstParam(undefined)).toBeUndefined();
  });
});
