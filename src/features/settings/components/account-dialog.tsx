"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * The shell for Settings' account editors (name, password). Its content unmounts when it
 * closes, so every opening starts from a fresh form.
 */
export function AccountDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: AccountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-5 bg-background p-5"
        // Radix links a description itself; without one it must be told there is none.
        {...(description === undefined
          ? { "aria-describedby": undefined }
          : {})}
      >
        <DialogHeader>
          <DialogTitle className="text-title">{title}</DialogTitle>
          {description === undefined ? null : (
            <DialogDescription className="text-footnote">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

interface AccountDialogActionsProps {
  pending: boolean;
  submitLabel: string;
  pendingLabel: string;
}

/** Cancel and the form's submit button, side by side as on iOS: Cancel first. */
export function AccountDialogActions({
  pending,
  submitLabel,
  pendingLabel,
}: AccountDialogActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 pt-1">
      <DialogClose asChild>
        <Button type="button" variant="secondary" size="medium">
          Cancel
        </Button>
      </DialogClose>
      <Button type="submit" size="medium" disabled={pending}>
        {pending ? pendingLabel : submitLabel}
      </Button>
    </div>
  );
}

/** A failure that belongs to no one field, such as a dropped connection. */
export function FormError({ message }: { message: string | null }) {
  if (message === null) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}
