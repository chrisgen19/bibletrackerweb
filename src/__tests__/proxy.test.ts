// Next.js 16.3 still exports the matcher helper under its middleware-era name, although
// the bundled docs already call it unstable_doesProxyMatch.
import {
  unstable_doesMiddlewareMatch as doesProxyMatch,
  getRedirectUrl,
} from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { config, proxy } from "../proxy";

function request(path: string, cookie?: string) {
  return new NextRequest(`http://localhost:3100${path}`, {
    headers: cookie === undefined ? {} : { cookie },
  });
}

const SESSION = "better-auth.session_token=abc.def";

describe("which paths the proxy runs on", () => {
  it.each([
    "/",
    "/day/2026-08-01",
    "/settings",
    "/sign-in",
  ])("runs on %s", (url) => {
    expect(doesProxyMatch({ config, url })).toBe(true);
  });

  it.each([
    "/api/auth/get-session",
    "/api/anything",
    "/_next/static/chunks/app.js",
    "/_next/image?url=x",
    "/favicon.ico",
    "/icon.png",
    "/manifest.webmanifest",
  ])("skips %s", (url) => {
    expect(doesProxyMatch({ config, url })).toBe(false);
  });
});

describe("proxy", () => {
  it("sends a visitor without a session cookie to sign-in", () => {
    expect(getRedirectUrl(proxy(request("/")))).toBe(
      "http://localhost:3100/sign-in",
    );
  });

  it("remembers the page they asked for", () => {
    expect(
      getRedirectUrl(proxy(request("/day/2026-08-01?book=GEN&chapter=1"))),
    ).toBe(
      "http://localhost:3100/sign-in?next=%2Fday%2F2026-08-01%3Fbook%3DGEN%26chapter%3D1",
    );
  });

  it("lets a request with a session cookie through", () => {
    expect(getRedirectUrl(proxy(request("/", SESSION)))).toBeNull();
  });

  it("recognises the __Secure- cookie used over HTTPS", () => {
    const secure = "__Secure-better-auth.session_token=abc.def";
    expect(getRedirectUrl(proxy(request("/", secure)))).toBeNull();
  });

  it("always lets visitors reach sign-in and sign-up", () => {
    expect(getRedirectUrl(proxy(request("/sign-in")))).toBeNull();
    expect(getRedirectUrl(proxy(request("/sign-up?next=%2F")))).toBeNull();
  });

  it("does not bounce a cookie holder away from sign-in", () => {
    // The cookie may be expired. Redirecting on its presence alone would loop between
    // "/" and "/sign-in"; the sign-in page checks the real session instead.
    expect(getRedirectUrl(proxy(request("/sign-in", SESSION)))).toBeNull();
  });
});
