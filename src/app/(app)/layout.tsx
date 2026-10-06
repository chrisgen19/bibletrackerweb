import type { ReactNode } from "react";

import { QueryProvider } from "@/components/query-provider";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { ReadingDataProvider } from "@/features/reading-plan/hooks/reading-data-provider";
import { getReadingSnapshot } from "@/lib/dal";
import { resolveReaderTimeZone } from "@/lib/reader-time-zone";
import { requireUser } from "@/lib/session";
import { getTodayDateKeyInZone } from "@/utils/zoned-date-key";

/**
 * Everything behind sign-in. The real session check happens here, not in the proxy.
 *
 * The reader's snapshot and "today" are loaded on the server, so the first render already
 * shows their reading; the provider takes over in the browser from there.
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const user = await requireUser();
  const [snapshot, timeZone] = await Promise.all([
    getReadingSnapshot(user.id),
    resolveReaderTimeZone(user.id),
  ]);

  return (
    <QueryProvider>
      <ReadingDataProvider
        initialSnapshot={snapshot}
        initialToday={getTodayDateKeyInZone(timeZone)}
        initialTimeZone={timeZone}
      >
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
      </ReadingDataProvider>
    </QueryProvider>
  );
}
