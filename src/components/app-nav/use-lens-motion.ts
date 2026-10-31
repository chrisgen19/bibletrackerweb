"use client";

import { type RefObject, useEffect, useRef, useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * Whether the browser can refract a backdrop through an SVG filter. Only Chromium can,
 * and only Chromium exposes `navigator.userAgentData`; Safari and Firefox would parse
 * `url(#...)` in backdrop-filter and then drop the whole effect.
 */
export const useCanRefract = (): boolean =>
  useSyncExternalStore(
    noSubscribe,
    () => "userAgentData" in navigator,
    () => false,
  );

/** The droplet's stretch while it travels: wide and flat, a little tall, then at rest. */
const SQUASH: Keyframe[] = [
  { transform: "scale(1, 1)" },
  { transform: "scale(1.3, 0.86)", offset: 0.22 },
  { transform: "scale(0.95, 1.05)", offset: 0.58 },
  { transform: "scale(1, 1)" },
];

/**
 * Squashes the droplet each time the lens moves to another tab. The travel itself is a
 * CSS transition on the lens; this only animates the droplet's own transform.
 */
export const useLensSquash = (
  droplet: RefObject<HTMLElement | null>,
  index: number,
): void => {
  const previous = useRef(index);

  useEffect(() => {
    const from = previous.current;
    previous.current = index;
    const node = droplet.current;
    if (from === index || from < 0 || index < 0 || node === null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // A longer hop stretches a little longer.
    const distance = Math.abs(index - from);
    node.animate(SQUASH, {
      duration: 420 + distance * 60,
      easing: "cubic-bezier(0.3, 0.7, 0.4, 1)",
    });
  }, [droplet, index]);
};
