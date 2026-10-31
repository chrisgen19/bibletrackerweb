"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { setUsername } from "@/actions/friends";
import { Button } from "@/components/ui/button";
import { TextField } from "@/features/auth/components/text-field";
import { setUsernameInput } from "@/features/friends/commands/inputs";
import { friendsErrorMessage } from "@/features/friends/commands/results";
import {
  forgetMissedUsername,
  readMissedUsername,
} from "@/features/friends/missed-username";

type Values = z.input<typeof setUsernameInput>;
type Parsed = z.output<typeof setUsernameInput>;

interface UsernameFormProps {
  initial?: string;
  submitLabel: string;
  /** Called only after the server saved the username. */
  onSaved: () => void | Promise<void>;
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
  const usernameField = register("username");

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
    await onSaved();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <div className="grid gap-2">
        <TextField
          id={`${id}-username`}
          label="Username"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          error={errors.username?.message}
          {...usernameField}
          onChange={(event) => {
            // The server's error was about the old value: drop it once the user edits.
            setFormError(null);
            return usernameField.onChange(event);
          }}
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

interface UsernameSetupProps {
  /** The reader, to find a username they picked at sign-up that was taken. */
  userId: string;
}

/** The first step: no username yet, so nothing else on the screen works. */
export function UsernameSetup({ userId }: UsernameSetupProps) {
  const router = useRouter();
  // Read after mount: storage is browser-only, and the server render has no note.
  const [missed, setMissed] = useState<string | null>(null);
  useEffect(() => {
    setMissed(readMissedUsername(userId));
  }, [userId]);

  return (
    <div className="grid gap-4">
      {missed === null ? null : (
        <p className="text-callout text-muted-foreground">
          @{missed} was already taken when you signed up, so pick another one.
        </p>
      )}
      <UsernameForm
        submitLabel="Continue"
        onSaved={() => {
          forgetMissedUsername();
          router.refresh();
        }}
      />
    </div>
  );
}
