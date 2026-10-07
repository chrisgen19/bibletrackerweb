import type { LucideIcon } from "lucide-react";

import { Panel } from "@/components/panel";

interface Stat {
  icon: LucideIcon;
  value: string;
  label: string;
}

/** Supporting statistics: streak, best streak, this read-through, times through. */
export function StatRow({ stats }: { stats: readonly Stat[] }) {
  return (
    // Two by two on a phone, one row from 640px.
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(({ icon: Icon, value, label }) => (
        <li key={label}>
          <Panel padded={false} className="h-full px-3 py-4">
            <Icon className="size-4 text-primary-muted" aria-hidden />
            <p className="mt-2 text-headline" data-testid={`stat-${label}`}>
              {value}
              <span className="sr-only"> {label}</span>
            </p>
            <p aria-hidden className="line-clamp-2 text-footnote text-faint">
              {label}
            </p>
          </Panel>
        </li>
      ))}
    </ul>
  );
}
