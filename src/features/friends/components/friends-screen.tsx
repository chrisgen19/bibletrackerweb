import { BookOpenCheck, HandHeart, type LucideIcon, Users } from "lucide-react";

import { Panel } from "@/components/panel";

const COMING: readonly { icon: LucideIcon; title: string; detail: string }[] = [
  {
    icon: Users,
    title: "Invite friends",
    detail: "Read alongside the people you choose.",
  },
  {
    icon: BookOpenCheck,
    title: "See who read today",
    detail: "A quiet nudge, without a leaderboard.",
  },
  {
    icon: HandHeart,
    title: "Keep each other going",
    detail: "Cheer a friend on when their streak is at risk.",
  },
];

/** A tab held for reading with friends, which is not built yet. */
export function FriendsScreen() {
  return (
    <main className="mx-auto w-full max-w-lg px-5 pt-6 pb-tab-bar">
      <h1 className="text-large-title">Friends</h1>

      <div className="mt-8 flex flex-col items-center text-center">
        {/* Three droplets, the tab bar's lens, gathered like a small group. */}
        <div aria-hidden className="flex items-end">
          <span className="droplet size-12 rounded-full opacity-70" />
          <span className="droplet -mx-3 flex size-20 items-center justify-center rounded-full">
            <Users className="size-8 text-primary" />
          </span>
          <span className="droplet size-12 rounded-full opacity-70" />
        </div>
        <p className="mt-5 text-title">Reading with friends is on its way</p>
        <p className="mt-2 max-w-[19rem] text-callout text-muted-foreground">
          Until then, your reading stays yours. Here is what is coming.
        </p>
      </div>

      <Panel padded={false} className="mt-8">
        <ul className="divide-y">
          {COMING.map(({ icon: Icon, title, detail }) => (
            <li key={title} className="flex items-center gap-4 px-4 py-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft">
                <Icon aria-hidden className="size-5 text-primary" />
              </span>
              <span className="min-w-0">
                <span className="block text-headline">{title}</span>
                <span className="block text-footnote text-muted-foreground">
                  {detail}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </main>
  );
}
