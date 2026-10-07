"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { FieldRow } from "@/components/field-row";
import { authErrorMessage } from "@/features/auth/auth-error-message";
import { TextField } from "@/features/auth/components/text-field";
import { type EditNameValues, editNameSchema } from "@/features/auth/schemas";
import { authClient, catchNetworkFailure } from "@/lib/auth-client";

import {
  AccountDialog,
  AccountDialogActions,
  FormError,
} from "./account-dialog";

/** The reader's name, as the account menu shows it, with an editor behind it. */
export function NameRow({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const row = useRef<HTMLButtonElement>(null);
  return (
    <>
      <FieldRow
        ref={row}
        label="Name"
        value={name.trim() === "" ? "Not set" : name}
        onClick={() => setOpen(true)}
        testId="name-row"
      />
      <AccountDialog
        open={open}
        onOpenChange={setOpen}
        title="Edit name"
        returnFocusRef={row}
      >
        <NameForm name={name} onSaved={() => setOpen(false)} />
      </AccountDialog>
    </>
  );
}

function NameForm({ name, onSaved }: { name: string; onSaved: () => void }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditNameValues>({
    resolver: zodResolver(editNameSchema),
    defaultValues: { name },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const { error } = await catchNetworkFailure(() =>
      authClient.updateUser({ name: values.name }),
    );
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    onSaved();
    // This row and the account menu both read the name from the server's session.
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <TextField
        id="name"
        label="Name"
        autoComplete="name"
        enterKeyHint="done"
        error={errors.name?.message}
        {...register("name")}
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
