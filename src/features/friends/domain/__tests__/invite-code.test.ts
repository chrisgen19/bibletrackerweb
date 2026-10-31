import { generateInviteCode, isInviteCode } from "../invite-code";

describe("generateInviteCode", () => {
  it("makes a 10 character alphanumeric code", () => {
    expect(generateInviteCode()).toMatch(/^[A-Za-z0-9]{10}$/);
  });

  it("does not repeat", () => {
    expect(new Set(Array.from({ length: 1000 }, generateInviteCode)).size).toBe(
      1000,
    );
  });

  it("rejects bytes at or above 248 before the modulo", () => {
    let calls = 0;
    const spy = vi.spyOn(crypto, "getRandomValues").mockImplementation(((
      array: Uint8Array,
    ) => {
      calls += 1;
      // First batch: all rejected. Second batch: 0 is accepted and maps to "A".
      array.fill(calls === 1 ? 255 : 0);
      return array;
    }) as typeof crypto.getRandomValues);
    try {
      expect(generateInviteCode()).toBe("AAAAAAAAAA");
      expect(calls).toBeGreaterThan(1);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("isInviteCode", () => {
  it("accepts a generated code", () => {
    expect(isInviteCode(generateInviteCode())).toBe(true);
  });

  it("rejects wrong length or characters", () => {
    expect(isInviteCode("abc")).toBe(false);
    expect(isInviteCode("../../etc!")).toBe(false);
    expect(isInviteCode("abcdefghij1")).toBe(false);
  });
});
