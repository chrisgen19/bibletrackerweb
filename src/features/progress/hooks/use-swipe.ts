"use client";

import {
  type MouseEvent,
  type PointerEvent,
  type RefObject,
  type TransitionEvent,
  useRef,
  useState,
} from "react";

/** How far a finger moves before a press becomes a swipe. */
const DRAG_THRESHOLD = 8;
/** A slow drag changes month past half the width, as an iOS paging scroller snaps. */
const PAGE_THRESHOLD = 0.5;
/** ...and a flick (px per ms over its last moments) does it from a shorter distance. */
const FLICK_VELOCITY = 0.4;
const FLICK_MIN_DISTANCE = 24;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Which page a released drag settles on: -1, 0 (back to centre) or +1. */
export function settleStep(
  dx: number,
  velocity: number,
  width: number,
): number {
  const flick =
    Math.abs(velocity) > FLICK_VELOCITY && Math.abs(dx) > FLICK_MIN_DISTANCE;
  if (Math.abs(dx) <= width * PAGE_THRESHOLD && !flick) return 0;
  return dx < 0 ? 1 : -1;
}

/**
 * Horizontal swipe between three side-by-side pages, the middle one showing.
 *
 * Vertical movement is left to the page (the viewport is `touch-pan-y`). A release past
 * half the width, or a flick, slides to the neighbour, as iOS's paging scroller settles;
 * anything less slides back. The click a drag would end with is swallowed so it does not
 * open a day. `onStep` runs once the slide has finished, in the same render that recentres
 * the track.
 */
export function useSwipe(
  viewport: RefObject<HTMLElement | null>,
  onStep: (step: number) => void,
) {
  const [offset, setOffset] = useState(0);
  const [settling, setSettling] = useState<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  /** The latest two positions, to measure the speed at release. */
  const recent = useRef<{ x: number; t: number }[]>([]);
  const dragging = useRef(false);
  const swallowClick = useRef(false);

  function finish(step: number) {
    setSettling(null);
    setOffset(0);
    if (step !== 0) onStep(step);
  }

  function settle(step: number, dx: number) {
    if (prefersReducedMotion() || (step === 0 && dx === 0)) finish(step);
    else setSettling(step);
  }

  const handlers = {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (event.button !== 0 || settling !== null) return;
      start.current = { x: event.clientX, y: event.clientY };
      recent.current = [{ x: event.clientX, t: Date.now() }];
      dragging.current = false;
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      if (start.current === null) return;
      const dx = event.clientX - start.current.x;
      const dy = event.clientY - start.current.y;
      if (!dragging.current) {
        if (Math.abs(dy) > DRAG_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
          start.current = null; // A vertical scroll: not ours.
          return;
        }
        if (Math.abs(dx) <= DRAG_THRESHOLD) return;
        dragging.current = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }
      recent.current = [
        ...recent.current.slice(-1),
        { x: event.clientX, t: Date.now() },
      ];
      setOffset(dx);
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      if (start.current === null) return;
      const dx = event.clientX - start.current.x;
      start.current = null;
      if (!dragging.current) return;
      dragging.current = false;
      swallowClick.current = true;
      const [before, last] = recent.current;
      const elapsed =
        before === undefined || last === undefined ? 0 : last.t - before.t;
      const velocity =
        before === undefined || last === undefined || elapsed <= 0
          ? 0
          : (last.x - before.x) / elapsed;
      settle(settleStep(dx, velocity, viewport.current?.clientWidth ?? 0), dx);
    },
    onPointerCancel() {
      if (dragging.current) settle(0, offset);
      start.current = null;
      dragging.current = false;
    },
    onClickCapture(event: MouseEvent<HTMLElement>) {
      if (!swallowClick.current) return;
      swallowClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };

  function onTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    // Day cells animate too, and their transitionend events bubble up to here.
    if (event.target !== event.currentTarget || settling === null) return;
    finish(settling);
  }

  // Pages sit at 0%, -33.3% (the middle, at rest) and -66.7% of the track.
  const transform =
    settling === null
      ? `translateX(calc(-100% / 3 + ${offset}px))`
      : `translateX(calc(-100% / 3 * ${1 + settling}))`;

  return { handlers, onTransitionEnd, transform, animating: settling !== null };
}
