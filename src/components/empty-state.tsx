import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateAction =
  | { label: string; href: string }
  | { label: string; onClick: () => void };

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  compact?: boolean;
}

/** The one place "nothing here" copy is rendered, so the tone stays consistent. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 text-center",
        compact ? "py-5" : "py-10",
      )}
    >
      {Icon === undefined ? null : (
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <Icon className="size-[22px] text-faint" aria-hidden />
        </div>
      )}
      <p className="text-headline">{title}</p>
      {description === undefined ? null : (
        <p className="mt-2 max-w-[300px] text-callout text-muted-foreground">
          {description}
        </p>
      )}
      {action === undefined ? null : (
        <Button
          variant="secondary"
          size="medium"
          className="mt-5 px-6"
          asChild={"href" in action}
          onClick={"onClick" in action ? action.onClick : undefined}
        >
          {"href" in action ? (
            <Link href={action.href}>{action.label}</Link>
          ) : (
            action.label
          )}
        </Button>
      )}
    </div>
  );
}
