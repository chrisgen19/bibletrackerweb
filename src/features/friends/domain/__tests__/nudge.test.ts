import { cheeringNames, firstName } from "../nudge";

describe("firstName", () => {
  it("takes the first word of the name", () => {
    expect(firstName({ name: "  Maria  Santos ", username: "maria" })).toBe(
      "Maria",
    );
  });

  it("falls back to the username for a blank name", () => {
    expect(firstName({ name: "   ", username: "maria" })).toBe("@maria");
  });
});

describe("cheeringNames", () => {
  const maria = { name: "Maria Santos", username: "maria" };
  const ben = { name: "Ben", username: "ben" };
  const cara = { name: "Cara", username: "cara" };
  const dan = { name: "Dan", username: "dan" };

  it("names one, two, or two and others", () => {
    expect(cheeringNames([maria])).toEqual({ names: ["Maria"], others: false });
    expect(cheeringNames([maria, ben])).toEqual({
      names: ["Maria", "Ben"],
      others: false,
    });
    expect(cheeringNames([maria, ben, cara, dan])).toEqual({
      names: ["Maria", "Ben"],
      others: true,
    });
  });
});
