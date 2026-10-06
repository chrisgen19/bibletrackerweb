import type { ReactNode } from "react";

import { QueryProvider } from "@/components/query-provider";
import { WriteStatus } from "@/features/reading-plan/components/write-status";
import { ReadingDataProvider } from "@/features/reading-plan/hooks/reading-data-provider";
import { AppearanceSync } from "@/features/settings/components/appearance-sync";
import { readAppearanceCookie } from "@/lib/appearance-cookie";
import { getAppearancePreference, getReadingSnapshot } from "@/lib/dal";
import { resolveReaderTimeZone } from "@/lib/reader-time-zone";
import { requireUser } from "@/lib/session";
import { DEFAULT_APPEARANCE } from "@/lib/settings";
import { getTodayDateKeyInZone } from "@/utils/zoned-date-key";

/**
 * Everything behind sign-in. The real session check happens here, not in the proxy.
 *
 * The reader's snapshot and "today" are loaded on the server, so the first render already
 * shows their reading; the provider takes over in the browser from there.
 */
export default async function AppLayout({
  children,
  sheet,
}: Readonly<{ children: ReactNode; sheet: ReactNode }>) {
  const user = await requireUser();
  const [snapshot, zone, deviceAppearance] = await Promise.all([
    getReadingSnapshot(user.id),
    resolveReaderTimeZone(user.id),
    readAppearanceCookie(),
  ]);
  // A device without its own appearance yet starts from the account's.
  const accountAppearance =
    deviceAppearance === null ? await getAppearancePreference(user.id) : null;

  return (
    <QueryProvider>
      <ReadingDataProvider
        initialSnapshot={snapshot}
        initialToday={getTodayDateKeyInZone(zone.timeZone)}
        initialTimeZone={zone.timeZone}
        initialTimeZoneFromDevice={zone.fromDevice}
      >
        {children}
        {/* The day sheet, when a day is opened from inside the app (@sheet/(.)day). */}
        {sheet}
        <WriteStatus />
        {accountAppearance === null ||
        accountAppearance === DEFAULT_APPEARANCE ? null : (
          <AppearanceSync preference={accountAppearance} />
        )}
      </ReadingDataProvider>
    </QueryProvider>
  );
}
