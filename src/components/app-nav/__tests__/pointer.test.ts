import { isPointInside } from "../pointer";

const BOX = { left: 10, right: 60, top: 100, bottom: 140 };

describe("isPointInside", () => {
  it("counts a point over the box", () => {
    expect(isPointInside(BOX, 30, 120)).toBe(true);
  });

  it("counts the edges, so a lift on the border still taps", () => {
    expect(isPointInside(BOX, 10, 100)).toBe(true);
    expect(isPointInside(BOX, 60, 140)).toBe(true);
  });

  it.each([
    [9, 120],
    [61, 120],
    [30, 99],
    [30, 141],
  ])("rejects (%i, %i), off the box", (x, y) => {
    expect(isPointInside(BOX, x, y)).toBe(false);
  });
});
