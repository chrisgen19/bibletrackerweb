"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { AccountDialog } from "@/features/settings/components/account-dialog";

import { UsernameForm } from "./username-form";

/** The reader's own `@username`, the thing they share, with a way to change it. */
export function UsernameLine({ username }: { username: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const change = useRef<HTMLButtonElement>(null);
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-footnote text-muted-foreground">
          Friends find you as
        </p>
        <p className="truncate text-title">@{username}</p>
      </div>
      <Button
        ref={change}
        variant="plain"
        size="lg"
        className="px-2"
        onClick={() => setOpen(true)}
      >
        Change
      </Button>
      <AccountDialog
        open={open}
        onOpenChange={setOpen}
        title="Change username"
        description="Friends find you by this. Your old username is freed straight away."
        returnFocusRef={change}
      >
        <UsernameForm
          initial={username}
          submitLabel="Save"
          onCancel={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </AccountDialog>
    </div>
  );
}
