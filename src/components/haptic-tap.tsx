"use client";

import { type ReactNode, useId } from "react";

import { cn } from "@/lib/utils";

/** expo-haptics' Android Success timings, which the app's completionHaptic plays. */
const SUCCESS_VIBRATION = [40, 100, 40];

interface HapticTapProps {
  /** The visible control. It still serves the keyboard, screen readers and the mouse. */
  children: ReactNode;
  /** Runs for a touch tap, which the overlay takes in place of the control underneath. */
  onTap: () => void;
  className?: string;
}

/**
 * Gives a touch tap on the wrapped control a haptic, the web's take on bibletrackerapp's
 * completionHaptic.
 *
 * Android gets navigator.vibrate. iPhone Safari has no Vibration API: a page's only haptic
 * is the tick of a native `<input type="checkbox" switch>`, and since iOS 26.5 (WebKit
 * fc1ef83) only for a trusted click, so script cannot fire it. A real tap on a label for
 * the switch still forwards a trusted click, so on touch screens a transparent label
 * covers the control and the switch's click does the control's job.
 *
 * The action waits for the switch's click: WebKit ticks before dispatching it, while
 * acting on the label's own click would re-render the overlay away before the label
 * forwards anything. The switch sits beside the label, not inside it, so it is clicked
 * once, and never under the finger, where WebKit's switch would swallow the touch and
 * block scrolling. Fine pointers never meet the overlay, so mouse hover and press styles
 * stay on the control.
 */
export function HapticTap({ children, onTap, className }: HapticTapProps) {
  const switchId = useId();

  function handleSwitchClick() {
    if ("vibrate" in navigator) navigator.vibrate(SUCCESS_VIBRATION);
    onTap();
  }

  return (
    <div
      className={cn(
        "relative transition-transform pointer-coarse:active:translate-y-px",
        className,
      )}
    >
      {children}
      <input
        id={switchId}
        type="checkbox"
        // React has no type for the switch attribute yet, and the haptic needs it.
        {...{ switch: "" }}
        tabIndex={-1}
        aria-hidden
        onClick={handleSwitchClick}
        className="pointer-events-none absolute size-px opacity-0"
      />
      {/* biome-ignore lint/a11y/noLabelWithoutControl: a hidden tap target, the control underneath carries the name */}
      <label
        htmlFor={switchId}
        aria-hidden
        className="absolute inset-0 hidden cursor-pointer pointer-coarse:block"
      />
    </div>
  );
}
