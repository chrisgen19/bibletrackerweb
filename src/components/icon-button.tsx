import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface IconButtonProps {
  icon: LucideIcon;
  /** Required: an icon-only control has no visible label to fall back on. */
  label: string;
  /** Navigates instead of acting. */
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "plain" | "filled";
  className?: string;
  testId?: string;
}

/** A round 44px icon control, the iOS app's IconButton. */
export function IconButton({
  icon: Icon,
  label,
  href,
  onClick,
  disabled,
  variant = "filled",
  className,
  testId,
}: IconButtonProps) {
  const classes = cn(
    "size-11 rounded-full text-muted-foreground",
    variant === "filled"
      ? "bg-muted hover:bg-pressed dark:hover:bg-pressed"
      : "hover:bg-muted",
    className,
  );
  const icon = <Icon className="size-[18px]" strokeWidth={2.25} aria-hidden />;

  if (href !== undefined) {
    return (
      <Button asChild variant="ghost" className={classes}>
        <Link href={href} aria-label={label} data-testid={testId}>
          {icon}
        </Link>
      </Button>
    );
  }
  return (
    <Button
      variant="ghost"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={classes}
      data-testid={testId}
    >
      {icon}
    </Button>
  );
}
