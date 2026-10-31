"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { AccountDialog } from "@/features/settings/components/account-dialog";

import { UsernameForm } from "./username-form";

/** The screen's title with the reader's own `@username` and a way to change it. */
export function UsernameHeader({ username }: { username: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const change = useRef<HTMLButtonElement>(null);
  return (
    <header>
      <h1 className="text-large-title">Friends</h1>
      <div className="mt-1 flex min-h-11 items-center gap-2">
        <p className="min-w-0 truncate text-body text-muted-foreground">
          @{username}
        </p>
        <Button
          ref={change}
          variant="plain"
          size="lg"
          className="px-2"
          onClick={() => setOpen(true)}
        >
          Change
        </Button>
      </div>
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
    </header>
  );
}
