import { describe, expect, it } from "vitest";

import { firstParam, safeNextPath } from "../safe-next-path";

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

describe("firstParam", () => {
  it("takes the first of repeated values", () => {
    expect(firstParam(["/a", "/b"])).toBe("/a");
    expect(firstParam("/a")).toBe("/a");
    expect(firstParam(undefined)).toBeUndefined();
  });
});
