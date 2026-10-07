import { Calendar } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Page not found" };

/** bibletrackerapp's not-found screen, naming the app as it is now called. */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <EmptyState
        icon={Calendar}
        title="This page doesn't exist"
        description="The link you followed doesn't lead anywhere in Bible Daily."
        action={{ label: "Go to your reading", href: "/" }}
      />
    </main>
  );
}
