import type { Metadata, Viewport } from "next";

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

/** The browser bar takes the page background, light or dark (globals.css). */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Rendered on the server so the first paint is already light or dark (globals.css).
  const appearance = (await readAppearanceCookie()) ?? DEFAULT_APPEARANCE;

  return (
    <html lang="en" data-appearance={appearance} className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
