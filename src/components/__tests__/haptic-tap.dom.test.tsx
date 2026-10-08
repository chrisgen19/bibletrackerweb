import { fireEvent, render, screen } from "@testing-library/react";

import { HapticTap } from "../haptic-tap";

function renderTap(onTap = vi.fn(), onClick = vi.fn()) {
  const { container } = render(
    <HapticTap onTap={onTap}>
      <button type="button" onClick={onClick}>
        Mark as Read
      </button>
    </HapticTap>,
  );
  const overlay = container.querySelector("label");
  const haptic = container.querySelector("input");
  if (!overlay || !haptic) throw new Error("HapticTap rendered no overlay");
  return { onTap, onClick, overlay, haptic };
}

describe("HapticTap", () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, "vibrate");
  });

  it("covers the control with a label for a native switch", () => {
    // WebKit ticks only for a trusted click on the switch, which a label tap forwards.
    const { overlay, haptic } = renderTap();

    expect(haptic.type).toBe("checkbox");
    expect(haptic.hasAttribute("switch")).toBe(true);
    expect(overlay.htmlFor).toBe(haptic.id);
    // Outside the label: a switch inside it would bounce a second click to the label.
    expect(overlay.contains(haptic)).toBe(false);
  });

  it("acts once for a tap on the overlay", () => {
    const { onTap, onClick, overlay } = renderTap();

    fireEvent.click(overlay);

    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("plays the app's success pattern where the Vibration API exists", () => {
    const vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, "vibrate", {
      value: vibrate,
      configurable: true,
    });
    const { overlay } = renderTap();

    fireEvent.click(overlay);

    expect(vibrate).toHaveBeenCalledWith([40, 100, 40]);
  });

  it("still acts without the Vibration API, as on iPhone Safari", () => {
    const { onTap, overlay } = renderTap();

    expect("vibrate" in navigator).toBe(false);
    fireEvent.click(overlay);

    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it("leaves the control itself to keyboards and screen readers", () => {
    const { onTap, onClick } = renderTap();

    // The overlay and switch are hidden from assistive tech, so the button is what
    // VoiceOver and Tab land on, and pressing it skips the haptic path.
    expect(screen.queryByRole("checkbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Mark as Read" }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onTap).not.toHaveBeenCalled();
  });
});
