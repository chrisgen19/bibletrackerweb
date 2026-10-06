// describeResetImpact from bibletrackerapp's reset-progress.test.ts, unchanged.
import { describe, expect, it } from "vitest";

import { describeResetImpact } from "../reset-progress";

describe("describeResetImpact", () => {
  it("says there is nothing to lose when the user has read nothing", () => {
    expect(describeResetImpact(0)).toBe("You have no completed readings yet.");
  });

  it("names how much will be lost", () => {
    expect(describeResetImpact(17)).toBe(
      "This will remove 17 completed chapters.",
    );
  });

  it("uses the singular for one chapter", () => {
    expect(describeResetImpact(1)).toBe(
      "This will remove 1 completed chapter.",
    );
  });
});
