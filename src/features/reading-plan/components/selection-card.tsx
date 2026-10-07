import { Check, type LucideIcon } from "lucide-react";
import { RadioGroup } from "radix-ui";
import { useId } from "react";

import { cn } from "@/lib/utils";

interface SelectionCardProps {
  value: string;
  title: string;
  description: string;
  icon: LucideIcon;
  selected: boolean;
}

/** A large choice in a radio group: "where would you like to begin?" (inside RadioGroup.Root). */
export function SelectionCard({
  value,
  title,
  description,
  icon: Icon,
  selected,
}: SelectionCardProps) {
  const id = useId();
  return (
    <RadioGroup.Item
      value={value}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      className={cn(
        "flex w-full items-center gap-3.5 rounded-2xl p-5 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
        selected
          ? "border-2 border-primary bg-primary-soft"
          : "border bg-card hover:bg-muted",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          selected
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="mr-2 flex-1">
        <span id={`${id}-title`} className="block text-headline">
          {title}
        </span>
        <span
          id={`${id}-description`}
          className="mt-0.5 block text-footnote text-muted-foreground"
        >
          {description}
        </span>
      </span>
      {selected ? (
        <Check className="size-4 text-primary" strokeWidth={3} aria-hidden />
      ) : null}
    </RadioGroup.Item>
  );
}
