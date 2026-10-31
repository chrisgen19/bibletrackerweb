/** Whether a pointer at (x, y) is over `box`, edges included: where a lifted finger counts as a tap. */
export const isPointInside = (
  box: Pick<DOMRect, "left" | "right" | "top" | "bottom">,
  x: number,
  y: number,
): boolean =>
  x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
