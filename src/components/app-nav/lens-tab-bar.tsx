"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { LensFilter } from "./lens-filter";
import { NAV_ITEMS, type NavItem, showsNav } from "./nav-items";
import { isPointInside } from "./pointer";
import { useCanRefract, useLensSquash } from "./use-lens-motion";

/** A press in progress: the lens follows the finger before the route changes. */
interface Press {
  index: number;
  /** The route it started on; a new route ends it. */
  pathname: string;
  held: boolean;
}

/**
 * The floating tab bar: a frosted capsule, and a tinted glass droplet over the current tab
 * that springs to the next one. The lens position is derived from the route (or a press),
 * and only its transform animates.
 */
export function LensTabBar() {
  const pathname = usePathname();
  const canRefract = useCanRefract();
  const droplet = useRef<HTMLSpanElement>(null);
  const [press, setPress] = useState<Press | null>(null);

  // A press belongs to the route it started on. Forgotten once that route is left, or the
  // back button would bring it back over a tab that is no longer the one pressed.
  useEffect(() => {
    setPress((p) => (p !== null && p.pathname !== pathname ? null : p));
  }, [pathname]);

  const activeIndex = NAV_ITEMS.findIndex((item) => item.match(pathname));
  const live = press?.pathname === pathname ? press : null;
  const lensIndex = live?.index ?? activeIndex;
  useLensSquash(droplet, lensIndex);

  if (!showsNav(pathname)) return null;

  // Lifting the finger keeps the lens where it is, for the navigation that follows.
  const release = () =>
    setPress((p) => (p === null ? p : { ...p, held: false }));
  const cancel = () => setPress(null);

  return (
    <nav
      aria-label="Main"
      data-tab-bar
      data-refract={canRefract ? "" : undefined}
      className="fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 mx-auto w-[calc(100%-2rem)] max-w-[22rem]"
    >
      {canRefract ? <LensFilter /> : null}
      <div className="relative grid h-[4.25rem] grid-cols-4 p-1.5">
        {/* A sibling, not a parent: a backdrop-filter parent would hide the page from the lens. */}
        <span aria-hidden className="glass-bar absolute inset-0 rounded-full" />
        <span
          aria-hidden
          data-testid="tab-lens"
          className={cn(
            "absolute inset-y-1.5 left-1.5 w-[calc((100%-0.75rem)/4)] transition-[transform,opacity] duration-[560ms] ease-(--ease-lens)",
            lensIndex < 0 && "opacity-0",
          )}
          style={{ transform: `translateX(${Math.max(lensIndex, 0) * 100}%)` }}
        >
          <span
            ref={droplet}
            className={cn(
              "glass-lens block size-full rounded-full transition-[scale] duration-200 ease-(--ease-lens)",
              live?.held && "scale-110",
            )}
          />
        </span>

        {NAV_ITEMS.map((item, index) => (
          <TabLink
            key={item.href}
            item={item}
            active={index === activeIndex}
            lit={index === lensIndex}
            onPress={() => setPress({ index, pathname, held: true })}
            onRelease={(inside) => (inside ? release() : cancel())}
          />
        ))}
      </div>
    </nav>
  );
}

interface TabLinkProps {
  item: NavItem;
  /** The current route's tab, for aria-current. */
  active: boolean;
  /** Under the lens right now, which leads the route while a press is held. */
  lit: boolean;
  onPress: () => void;
  /** Whether the finger lifted over the tab; off it, the tap is abandoned. */
  onRelease: (inside: boolean) => void;
}

function TabLink({ item, active, lit, onPress, onRelease }: TabLinkProps) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onPointerDown={(event) => {
        // A right or middle click, or one with a modifier key, opens a menu, a tab or a
        // download: the browser's, not a move to this tab.
        const modified =
          event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
        if (event.button === 0 && !modified) onPress();
      }}
      onPointerUp={(event) =>
        onRelease(
          isPointInside(
            event.currentTarget.getBoundingClientRect(),
            event.clientX,
            event.clientY,
          ),
        )
      }
      onPointerCancel={() => onRelease(false)}
      onPointerLeave={(event) => {
        // A mouse is not captured like a finger: once it leaves with the button down, its
        // release lands elsewhere. A finger's pointerleave comes after it has lifted.
        if (event.pointerType === "mouse" && (event.buttons & 1) === 1) {
          onRelease(false);
        }
      }}
      className={cn(
        "relative z-10 flex min-h-11 touch-manipulation select-none flex-col items-center justify-center gap-0.5 rounded-full font-medium text-[0.6875rem] leading-[0.875rem] outline-none transition-colors duration-200 [-webkit-tap-highlight-color:transparent]",
        "focus-visible:ring-2 focus-visible:ring-primary",
        lit ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon
        aria-hidden
        className="size-[1.375rem]"
        strokeWidth={lit ? 2.25 : 1.75}
      />
      <span>{item.label}</span>
    </Link>
  );
}
