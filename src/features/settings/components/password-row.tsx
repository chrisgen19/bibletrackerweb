"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { FieldRow } from "@/components/field-row";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { authErrorMessage } from "@/features/auth/auth-error-message";
import { TextField } from "@/features/auth/components/text-field";
import {
  type ChangePasswordValues,
  changePasswordSchema,
  PASSWORD_MIN,
} from "@/features/auth/schemas";
import { authClient, catchNetworkFailure } from "@/lib/auth-client";

import {
  AccountDialog,
  AccountDialogActions,
  FormError,
} from "./account-dialog";

/**
 * Change password, for an email + password account. A Google-only account has no password
 * to change, so Settings leaves this row out for it.
 */
export function PasswordRow({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [changed, setChanged] = useState(false);

  function onOpenChange(next: boolean) {
    setOpen(next);
    // Reset on opening only, so the title does not flip back while the dialog fades out.
    if (next) setChanged(false);
  }

  return (
    <>
      <FieldRow
        label="Password"
        value="Change"
        onClick={() => onOpenChange(true)}
        testId="password-row"
      />
      <AccountDialog
        open={open}
        onOpenChange={onOpenChange}
        title={changed ? "Password changed" : "Change password"}
        description={
          changed
            ? "Use your new password next time you sign in. Your other devices have been signed out."
            : "You'll stay signed in here. Your other devices will be signed out."
        }
      >
        {changed ? (
          <DoneButton />
        ) : (
          <PasswordForm email={email} onChanged={() => setChanged(true)} />
        )}
      </AccountDialog>
    </>
  );
}

function PasswordForm({
  email,
  onChanged,
}: {
  email: string;
  onChanged: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const { error } = await catchNetworkFailure(() =>
      authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.password,
        // A changed password is often the answer to someone else knowing the old one.
        revokeOtherSessions: true,
      }),
    );
    if (error && "code" in error && error.code === "INVALID_PASSWORD") {
      setError("currentPassword", {
        message: "That isn't your current password.",
      });
      return;
    }
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    onChanged();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {/* Tells a password manager whose password this is, so it updates the right entry. */}
      <input
        type="email"
        name="username"
        autoComplete="username"
        value={email}
        readOnly
        hidden
      />
      <TextField
        id="current-password"
        label="Current password"
        type="password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register("currentPassword")}
      />
      <TextField
        id="new-password"
        label={`New password (at least ${PASSWORD_MIN} characters)`}
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <TextField
        id="confirm-new-password"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        enterKeyHint="done"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      <FormError message={formError} />
      <AccountDialogActions
        pending={isSubmitting}
        submitLabel="Save"
        pendingLabel="Saving..."
      />
    </form>
  );
}

/** Takes the focus from the submit button the form took away with it. */
function DoneButton() {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <DialogClose asChild>
      <Button ref={ref} size="medium">
        Done
      </Button>
    </DialogClose>
  );
}
