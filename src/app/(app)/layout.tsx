import type { ReactNode } from "react";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { requireUser } from "@/lib/session";

/** Everything behind sign-in. The real session check happens here, not in the proxy. */
export default async function AppLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const user = await requireUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3">
        <span className="font-semibold">Bible Daily</span>
        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden truncate text-sm text-muted-foreground sm:inline">
            {user.email}
          </span>
          <SignOutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
