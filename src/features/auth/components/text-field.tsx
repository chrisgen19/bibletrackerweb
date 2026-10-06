import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TextFieldProps extends ComponentProps<typeof Input> {
  id: string;
  label: string;
  /** Validation message; also marks the input invalid for assistive tech. */
  error?: string;
}

/** A labelled input with its error message wired up for screen readers. */
export function TextField({ id, label, error, ...input }: TextFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={error !== undefined}
        aria-describedby={error === undefined ? undefined : errorId}
        className="h-10"
        {...input}
      />
      {error === undefined ? null : (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
