"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { setUsername } from "@/actions/friends";
import { Button } from "@/components/ui/button";
import { TextField } from "@/features/auth/components/text-field";
import { setUsernameInput } from "@/features/friends/commands/inputs";
import { friendsErrorMessage } from "@/features/friends/commands/results";

type Values = z.input<typeof setUsernameInput>;
type Parsed = z.output<typeof setUsernameInput>;

interface UsernameFormProps {
  initial?: string;
  submitLabel: string;
  /** Called only after the server saved the username. */
  onSaved: () => void;
  /** Adds a Cancel button, for the dialog. */
  onCancel?: () => void;
}

/**
 * Picks a username: validated here with the shared schema, saved by the Server Action,
 * whose error copy (taken, just taken) shows inline.
 */
export function UsernameForm({
  initial = "",
  submitLabel,
  onSaved,
  onCancel,
}: UsernameFormProps) {
  const id = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values, unknown, Parsed>({
    resolver: zodResolver(setUsernameInput),
    defaultValues: { username: initial },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const result = await setUsername(values);
      if (!result.ok) {
        setFormError(friendsErrorMessage(result.error));
        return;
      }
    } catch {
      setFormError(friendsErrorMessage("network"));
      return;
    }
    onSaved();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <div className="grid gap-2">
        <TextField
          id={`${id}-username`}
          label="Username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          error={errors.username?.message}
          {...register("username")}
        />
        <p className="text-footnote text-muted-foreground">
          3 to 20 letters, numbers or underscores
        </p>
      </div>
      {formError === null ? null : (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
      <div className={onCancel ? "grid grid-cols-2 gap-3" : "grid"}>
        {onCancel ? (
          <Button
            type="button"
            variant="secondary"
            size="medium"
            onClick={onCancel}
          >
            Cancel
          </Button>
        ) : null}
        <Button type="submit" size="medium" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** The first step: no username yet, so nothing else on the screen works. */
export function UsernameSetup() {
  const router = useRouter();
  return (
    <UsernameForm submitLabel="Continue" onSaved={() => router.refresh()} />
  );
}
