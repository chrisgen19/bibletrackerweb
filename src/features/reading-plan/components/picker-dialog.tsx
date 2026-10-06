"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

import { IconButton } from "@/components/icon-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

interface PickerDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Under the title, e.g. the book a chapter is being chosen from. */
  description?: string;
  /** Named for screen readers, as on iOS: "Close chapter picker". */
  closeLabel: string;
  /** Pinned above the scrolling list, e.g. a search field. */
  toolbar?: ReactNode;
  children: ReactNode;
}

/** The shell the book, chapter and verse pickers share: iOS's page sheet as a dialog. */
export function PickerDialog({
  open,
  onClose,
  title,
  description,
  closeLabel,
  toolbar,
  children,
}: PickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden bg-background p-0 sm:max-w-md"
        // Radix links a description itself; without one it must be told there is none.
        {...(description === undefined
          ? { "aria-describedby": undefined }
          : {})}
        onOpenAutoFocus={(event) => {
          // Open on what the picker marks (the current choice, or the search field)
          // rather than on the first focusable element, the close button.
          const target = event.currentTarget;
          if (!(target instanceof HTMLElement)) return;
          const marked = target.querySelector<HTMLElement>("[data-autofocus]");
          if (marked === null) return;
          event.preventDefault();
          marked.focus();
        }}
      >
        <div className="flex items-center gap-3 px-5 pt-4">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-title">{title}</DialogTitle>
            {description === undefined ? null : (
              <DialogDescription className="mt-0.5 text-footnote text-muted-foreground">
                {description}
              </DialogDescription>
            )}
          </div>
          <IconButton icon={X} label={closeLabel} onClick={onClose} />
        </div>
        {toolbar}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-6">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
