import type { Metadata, Viewport } from "next";

import { themeColorsFor } from "@/lib/appearance";
import { readAppearanceCookie } from "@/lib/appearance-cookie";
import { DEFAULT_APPEARANCE } from "@/lib/settings";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Bible Daily", template: "%s | Bible Daily" },
  description:
    "A daily Bible reading tracker. One chapter a day, tracked on a monthly calendar.",
  // Added to the home screen on iOS, it opens without Safari's bars, named as the app.
  appleWebApp: {
    capable: true,
    title: "Bible Daily",
    statusBarStyle: "default",
  },
};

/**
 * The browser bar takes the page background, so it follows this device's appearance as
 * <html data-appearance> does. Always one tag per device scheme, even when both carry
 * the same colour: changing the appearance recolours these tags (applyAppearance).
 */
export async function generateViewport(): Promise<Viewport> {
  const colors = themeColorsFor(
    (await readAppearanceCookie()) ?? DEFAULT_APPEARANCE,
  );
  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: colors.light },
      { media: "(prefers-color-scheme: dark)", color: colors.dark },
    ],
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Rendered on the server so the first paint is already light or dark (globals.css).
  const appearance = (await readAppearanceCookie()) ?? DEFAULT_APPEARANCE;

  return (
    <html lang="en" data-appearance={appearance} className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
