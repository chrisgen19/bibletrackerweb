import { sameKey } from "../push-client";

const KEY =
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

/** The key as the ArrayBuffer a PushSubscription reports. */
const toBuffer = (base64url: string): ArrayBuffer => {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
};

describe("sameKey", () => {
  it("is true for the same key", () => {
    expect(sameKey(toBuffer(KEY), KEY)).toBe(true);
  });

  it("is false for a different key of the same length", () => {
    const other = toBuffer(KEY);
    new Uint8Array(other).reverse();
    expect(sameKey(other, KEY)).toBe(false);
  });

  it("is false for a different length", () => {
    expect(sameKey(new ArrayBuffer(10), KEY)).toBe(false);
  });

  it("is null when the browser does not report a key", () => {
    expect(sameKey(null, KEY)).toBeNull();
  });
});
