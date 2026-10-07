"use client";

import { type KeyboardEvent, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const COLUMNS = 5;

interface NumberGridProps {
  numbers: readonly number[];
  selected: number;
  /** What a screen reader hears for each number. */
  labelFor: (value: number) => string;
  /** Gets a hint of the accent: the verse that finishes the chapter. */
  emphasised?: number;
  label: string;
  onSelect: (value: number) => void;
}

/**
 * The chapter and verse grids: five columns, as on iOS. One button is in the tab order
 * at a time; the arrow keys move around the grid, Home and End to either end.
 */
export function NumberGrid({
  numbers,
  selected,
  labelFor,
  emphasised,
  label,
  onSelect,
}: NumberGridProps) {
  const [active, setActive] = useState(() =>
    Math.max(0, numbers.indexOf(selected)),
  );
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLFieldSetElement>) {
    const moves: Record<string, number> = {
      ArrowRight: active + 1,
      ArrowLeft: active - 1,
      ArrowDown: active + COLUMNS,
      ArrowUp: active - COLUMNS,
      Home: 0,
      End: numbers.length - 1,
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const next = Math.min(numbers.length - 1, Math.max(0, target));
    setActive(next);
    buttons.current[next]?.focus();
  }

  return (
    <fieldset onKeyDown={handleKeyDown} className="grid grid-cols-5 gap-2">
      <legend className="sr-only">{label}</legend>
      {numbers.map((value, position) => {
        const isSelected = value === selected;
        return (
          <button
            key={value}
            ref={(element) => {
              buttons.current[position] = element;
            }}
            type="button"
            tabIndex={position === active ? 0 : -1}
            // The dialog opens with focus here, so Enter alone keeps the current choice.
            data-autofocus={position === active ? "" : undefined}
            aria-pressed={isSelected}
            aria-label={labelFor(value)}
            onFocus={() => setActive(position)}
            onClick={() => onSelect(value)}
            className={cn(
              "flex h-[52px] items-center justify-center rounded-lg text-body outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-pressed active:bg-pressed",
              !isSelected &&
                value === emphasised &&
                "border border-primary-muted",
            )}
          >
            {value}
          </button>
        );
      })}
    </fieldset>
  );
}
