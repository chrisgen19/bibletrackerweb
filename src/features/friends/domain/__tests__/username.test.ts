import {
  normalizeUsername,
  RESERVED_USERNAMES,
  usernameSchema,
} from "../username";

describe("normalizeUsername", () => {
  it("trims, strips one leading @ and lowercases", () => {
    expect(normalizeUsername("  @Maria_1 ")).toBe("maria_1");
  });

  it("strips one @ only", () => {
    expect(normalizeUsername("@@x")).toBe("@x");
  });
});

describe("usernameSchema", () => {
  it("outputs the normalised username", () => {
    expect(usernameSchema.parse(" @Maria_1")).toBe("maria_1");
  });

  it("rejects bad shapes with the format message", () => {
    for (const bad of [
      "ab",
      "a".repeat(21),
      "has space",
      "dash-ed",
      "émile",
      "@@xyz",
    ]) {
      const result = usernameSchema.safeParse(bad);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(
        "Use 3 to 20 letters, numbers or underscores.",
      );
    }
  });

  it("accepts the length bounds", () => {
    expect(usernameSchema.safeParse("abc").success).toBe(true);
    expect(usernameSchema.safeParse("a".repeat(20)).success).toBe(true);
  });

  it("refuses reserved names in any case", () => {
    expect(usernameSchema.safeParse("Admin").error?.issues[0]?.message).toBe(
      "That username isn't available.",
    );
    for (const name of RESERVED_USERNAMES) {
      expect(usernameSchema.safeParse(name.toUpperCase()).success).toBe(false);
    }
  });

  it("works inside an object schema", async () => {
    const { z } = await import("zod");
    expect(
      z.object({ username: usernameSchema }).parse({ username: "@Bob_x" }),
    ).toEqual({
      username: "bob_x",
    });
  });
});
